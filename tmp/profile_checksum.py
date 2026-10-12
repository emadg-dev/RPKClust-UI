import sys, time
sys.path.insert(0, ".")
from rpkclust.config import Config
from rpkclust.catalog import resolve_dataset
from rpkclust.io.loader import load_pcap
from rpkclust.eval.ground_truth import clean_protocol_messages
from rpkclust.model import Trace
from rpkclust.pipeline import run_pipeline
from rpkclust.detectors.base import Context
from rpkclust.detectors.registry import BOUNDARY_RULES, EXTRA_RULES
from rpkclust.trace import _rule_matrix, _ok_checksum

meta = resolve_dataset("binaryinferno", "dhcp_1000")
raw = load_pcap(meta["file"], Config())
cleaned, _, _ = clean_protocol_messages(raw.messages, "dhcp", 1000)
msgs = cleaned
config = Config()
pairs = raw.pairs
capture_range = raw.capture_range

det_by_name = {d.name: d for d in BOUNDARY_RULES + EXTRA_RULES}
checksum_det = det_by_name["checksum"]

for offset in (10, 60, 120, 200, 240):
    ctx = Context(messages=msgs, offset=offset, capture_range=capture_range,
                  pairs=pairs, config=config)
    slices = [m.data[offset:offset + 2] for m in msgs]
    t0 = time.perf_counter()
    checksum_det.check(slices, ctx)
    t_check = time.perf_counter() - t0
    t0 = time.perf_counter()
    _ok_checksum(slices, msgs, ctx, config)
    t_ok = time.perf_counter() - t0
    print("offset=%d check=%.4fs ok=%.4fs" % (offset, t_check, t_ok))
