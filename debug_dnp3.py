import os, sys, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rpkclust.config import Config
from rpkclust.catalog import SOURCES
from rpkclust.io.loader import load_pcap
from rpkclust.pipeline import run_pipeline
from rpkclust.eval.ground_truth import extract_ground_truth_label
from rpkclust.model import Message, Trace

proto = sys.argv[1] if len(sys.argv) > 1 else "dnp3"
src   = sys.argv[2] if len(sys.argv) > 2 else "netplier"
cfg = Config()

# 1) hash check: are netplier and icsreal files identical?
print("=== file hashes ===")
for s in SOURCES.values():
    for d in s["datasets"]:
        if os.path.exists(d["file"]):
            h = hashlib.md5(open(d["file"], "rb").read()).hexdigest()[:10]
            print(f"{s['id']:9s} {d['id']:7s} {h}  {os.path.getsize(d['file'])} B")

# 2) pipeline on one dataset
d = next(x for x in SOURCES[src]["datasets"] if x["id"] == proto)
trace = load_pcap(d["file"], cfg)
msgs = [Message(id=i, data=m.data, ts=m.ts, src=m.src, dst=m.dst, sport=m.sport,
                dport=m.dport, direction=m.direction, session_id=m.session_id,
                label=extract_ground_truth_label(proto, m.data))
        for i, m in enumerate(trace.messages[:100])]
res = run_pipeline(Trace(messages=msgs, pairs=trace.pairs,
                         capture_range=trace.capture_range), cfg)

print(f"\n=== {src}/{proto}: B={res.boundary.B} min_len={res.boundary.min_len} ===")
lens = sorted({len(m.data) for m in msgs})
print("message lengths:", lens[:15])
print("\n--- boundary hits (first-match) ---")
for h in sorted(res.boundary.hits, key=lambda h: h.offset):
    print(f"off={h.offset:3d} len={h.length} rule={h.rule:10s} {h.info}")

print("\n--- candidates ---")
print(sorted({(c.region, c.offset, c.length) for c in res.candidates}))

for dname, kw in res.keywords.items():
    print(f"\n--- ranking [{dname}] ---")
    for r in kw.ranking:
        c = r["candidate"]
        print(f"off={c.offset:3d} len={c.length} post={r['posterior']:.3f} "
              f"p_f={r['p_f']:.3f} p_bit={r['p_bit']:.3f} p_off={r['p_offset']:.3f}")