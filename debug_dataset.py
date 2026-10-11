"""
Read-only diagnostic for one dataset.
Usage: py debug_dataset.py <source> <dataset> [max_messages]
Example: py debug_dataset.py netplier modbus
Writes debug_<source>_<dataset>.txt (utf-8) and prints it.
"""
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rpkclust.config import Config
from rpkclust.catalog import resolve_dataset
from rpkclust.io.loader import load_pcap, load_csv
from rpkclust.model import Message, Trace, BoundaryResult
from rpkclust.boundary import find_boundary
from rpkclust.detectors.registry import all_hits, EXTRA_RULES
from rpkclust.candidates import generate_candidates
from rpkclust.constraints.stage1 import evaluate_stage1
from rpkclust.constraints.stage2 import evaluate_stage2
from rpkclust.eval.ground_truth import extract_ground_truth_label, PROTOCOL_TRUE_KEYWORDS

src, ds = sys.argv[1], sys.argv[2]
max_msgs = int(sys.argv[3]) if len(sys.argv) > 3 else 100
meta = resolve_dataset(src, ds)
proto, path = meta["protocol"], meta["file"]
cfg = Config()
true = PROTOCOL_TRUE_KEYWORDS.get(proto, {})
T = (true.get("offset"), true.get("length"))

lines = []
def out(s=""):
    lines.append(str(s))
    print(s)

trace = load_csv(path, cfg) if path.endswith(".csv") else load_pcap(path, cfg)
msgs = []
for m in trace.messages:
    d = m.data
    if proto == "modbus" and len(d) >= 6:
        L = int.from_bytes(d[4:6], "big")
        if len(d) > L + 6:
            d = d[:L + 6]
    elif proto == "smb" and (len(d) < 8 or d[4:8] != b"\xffSMB"):
        continue
    elif proto == "smb2" and (len(d) < 8 or d[4:8] != b"\xfeSMB"):
        continue
    msgs.append(Message(id=len(msgs), data=d, ts=m.ts, src=m.src, dst=m.dst, sport=m.sport,
                        dport=m.dport, direction=m.direction, session_id=m.session_id,
                        label=extract_ground_truth_label(proto, d)))
msgs = msgs[:max_msgs]
pairs = trace.pairs

out(f"# {src}/{ds}  proto={proto}  true={T}  config: normalize={cfg.stage1_normalize} clip={cfg.prob_clip} "
    f"mode={cfg.predicate_mode} top_k={cfg.stage1_top_k} card={cfg.candidate_max_distinct_ratio}")
out(f"messages={len(msgs)}  c2s={sum(m.direction=='c2s' for m in msgs)}  "
    f"s2c={sum(m.direction=='s2c' for m in msgs)}  pairs={len(pairs)}")
out(f"length histogram: {sorted(Counter(len(m.data) for m in msgs).items())[:12]}")

b = find_boundary(msgs, cfg, pairs)
out(f"\n## boundary B={b.B} min_len={b.min_len}")
out("first-match hits: " + ", ".join(f"{h.rule}@{h.offset}/{h.length}" for h in b.hits))
extra = all_hits(msgs, cfg, max_offset=b.B, pairs=pairs, detectors=EXTRA_RULES)
out("extra (float/length) hits: " + (", ".join(f"{h.rule}@{h.offset}/{h.length}" for h in extra) or "none"))
cb = BoundaryResult(B=b.B, hits=b.hits + extra, min_len=b.min_len, direction=b.direction)
cands, diag = generate_candidates(msgs, cb, cfg)
fd = diag.get("for_diagnostics", {})
out(f"excluded={fd.get('excluded_bytes')}  sparse={fd.get('sparse_bytes')}")
out(f"S={fd.get('available_S')}")
out(f"exclusion_reasons={fd.get('exclusion_reasons')}")
out(f"\n## pool ({len(cands)}): " + ", ".join(f"{c.offset}/{c.length}" for c in cands))
out(f"true keyword in pool: {any((c.offset, c.length) == T for c in cands)}")

for d in ("c2s", "s2c"):
    tm = [m for m in msgs if m.direction == d]
    s1 = evaluate_stage1(msgs, cands, b.B, cfg, pairs, d)
    out(f"\n## {d} stage 1 ({len(tm)} msgs)")
    out("cand | #clus | #dist | singletons | p_m | p_r | p_s | p_d | p_f | rank")
    for s in s1.ranking:
        cl = s.clusters
        sing = sum(1 for v in cl.values() if len(v) == 1)
        mark = "  <== TRUE" if (s.candidate.offset, s.candidate.length) == T else ""
        out(f"{s.candidate.offset}/{s.candidate.length} | {len(cl)} | {len([k for k in cl if k is not None])} | "
            f"{sing} | {s.p_m:.4f} | {s.p_r:.4f} | {s.p_s:.4f} | {s.p_d:.2f} | {s.p_f:.4f} | {s.rank}{mark}")
    kw = evaluate_stage2(msgs, s1, cfg, d)
    out(f"## {d} stage 2 (top_k={cfg.stage1_top_k})")
    out("cand | p_bit | p_offset | p_f | posterior")
    for r in kw.ranking:
        c = r["candidate"]
        mark = "  <== TRUE" if (c.offset, c.length) == T else ""
        out(f"{c.offset}/{c.length} | {r['p_bit']:.4f} | {r['p_offset']:.2f} | {r['p_f']:.4f} | {r['posterior']:.6f}{mark}")
    out(f"WINNER {d}: {kw.candidate.offset}/{kw.candidate.length}")

fn = f"debug_{src}_{ds}.txt"
with open(fn, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print(f"\nSaved {fn}")