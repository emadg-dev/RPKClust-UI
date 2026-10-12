"""Time each per-message satisfaction fn across the full rule matrix for dhcp_1000."""
import sys, time
sys.path.insert(0, ".")
from rpkclust.io.loader import load_pcap
from rpkclust.eval.ground_truth import clean_protocol_messages
from rpkclust.config import Config
from rpkclust.detectors.registry import BOUNDARY_RULES, EXTRA_RULES
from rpkclust.detectors.base import Context
from rpkclust.catalog import resolve_dataset
from rpkclust.trace import _RULE_OK_FNS

d_meta = resolve_dataset("binaryinferno", "dhcp_1000")
print("dataset:", d_meta["file"])
msgs_raw = load_pcap(d_meta["file"], Config()).messages
msgs, dropped, info = clean_protocol_messages(msgs_raw, "dhcp", max_messages=1000)
config = Config()
min_len = min(len(m.data) for m in msgs)
limit = min(min_len, 300)
print(f"n={len(msgs)} min_len={min_len} limit={limit}")

for det in BOUNDARY_RULES + EXTRA_RULES:
    ok_fn = _RULE_OK_FNS.get(det.name)
    if ok_fn is None:
        continue
    t0 = time.perf_counter()
    n_evals = 0
    for offset in range(limit):
        ctx = Context(messages=msgs, offset=offset,
                      capture_range=(min(m.ts for m in msgs), max(m.ts for m in msgs)),
                      pairs=[], config=config)
        for l in det.lengths:
            if offset + l > min_len:
                continue
            slices = [m.data[offset:offset + l] for m in msgs]
            ok_fn(slices, msgs, ctx, config)
            n_evals += 1
    dt = time.perf_counter() - t0
    print(f"{det.name:10s} {dt:8.2f}s  ({n_evals} evals)")
