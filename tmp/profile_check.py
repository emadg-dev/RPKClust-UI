import sys, time
sys.path.insert(0, ".")
from rpkclust.config import Config
from rpkclust.catalog import resolve_dataset
from rpkclust.io.loader import load_pcap
from rpkclust.eval.ground_truth import clean_protocol_messages
from rpkclust.detectors.base import Context
from rpkclust.detectors.registry import BOUNDARY_RULES, EXTRA_RULES

meta = resolve_dataset("binaryinferno", "dhcp_1000")
raw = load_pcap(meta["file"], Config())
cleaned, _, _ = clean_protocol_messages(raw.messages, "dhcp", 1000)
msgs = cleaned
config = Config()
pairs = raw.pairs
capture_range = raw.capture_range
min_len = min(len(m.data) for m in msgs)
print("n =", len(msgs), "min_len =", min_len)

# Time check() calls only (no satisfaction)
t0 = time.perf_counter()
n_evals = 0
for offset in range(min_len):
    ctx = Context(messages=msgs, offset=offset, capture_range=capture_range,
                  pairs=pairs, config=config)
    for det in BOUNDARY_RULES + EXTRA_RULES:
        for l in det.lengths:
            if offset + l > min_len:
                continue
            slices = [m.data[offset:offset + l] for m in msgs]
            det.check(slices, ctx)
            n_evals += 1
t_check = time.perf_counter() - t0
print("check()-only: %.2fs over %d evals" % (t_check, n_evals))
