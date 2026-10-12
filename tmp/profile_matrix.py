import sys, time
sys.path.insert(0, ".")
from rpkclust.config import Config
from rpkclust.catalog import resolve_dataset
from rpkclust.io.loader import load_pcap
from rpkclust.eval.ground_truth import clean_protocol_messages
from rpkclust.model import Trace
from rpkclust.detectors.base import Context
from rpkclust.detectors.registry import BOUNDARY_RULES, EXTRA_RULES

meta = resolve_dataset("binaryinferno", "dhcp_100")
raw = load_pcap(meta["file"], Config())
cleaned, _, _ = clean_protocol_messages(raw.messages, "dhcp", 100)
msgs = cleaned
print("n =", len(msgs), "min_len =", min(len(m.data) for m in msgs))

config = Config()
pairs = raw.pairs
capture_range = raw.capture_range

# time each rule at a few offsets
for offset in (0, 60, 120, 180, 240):
    if offset >= 241:
        continue
    ctx = Context(messages=msgs, offset=offset, capture_range=capture_range,
                  pairs=pairs, config=config)
    for det in BOUNDARY_RULES + EXTRA_RULES:
        for l in det.lengths:
            if offset + l > 241:
                continue
            slices = [m.data[offset:offset + l] for m in msgs]
            t0 = time.perf_counter()
            for _ in range(3):
                det.check(slices, ctx)
            dt = (time.perf_counter() - t0) / 3
            if dt > 0.002:
                print("offset=%d %s/%d: %.4fs" % (offset, det.name, l, dt))
