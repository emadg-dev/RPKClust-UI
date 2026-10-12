import sys, time
sys.path.insert(0, ".")
from rpkclust.config import Config
from rpkclust.catalog import resolve_dataset
from rpkclust.io.loader import load_pcap
from rpkclust.eval.ground_truth import clean_protocol_messages
from rpkclust.model import Trace
from rpkclust.pipeline import run_pipeline

meta = resolve_dataset("binaryinferno", "dhcp_1000")
raw = load_pcap(meta["file"], Config())
cleaned, _, _ = clean_protocol_messages(raw.messages, "dhcp", 1000)
trace = Trace(messages=cleaned, pairs=raw.pairs, capture_range=raw.capture_range)
config = Config()

t0 = time.perf_counter()
res = run_pipeline(trace, config, capture=False)
t1 = time.perf_counter()
print("pipeline (capture=False) wall: %.2fs" % (t1 - t0))
print("timing:", {k: round(v, 3) for k, v in res.diagnostics["timing"].items()})
