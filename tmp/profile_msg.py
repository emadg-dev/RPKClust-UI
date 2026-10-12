import cProfile, pstats, sys, io
sys.path.insert(0, ".")
from rpkclust.config import Config
from rpkclust.catalog import resolve_dataset
from rpkclust.io.loader import load_pcap
from rpkclust.eval.ground_truth import clean_protocol_messages
from rpkclust.model import Trace
from rpkclust.pipeline import run_pipeline
from rpkclust.trace import build_message_trace

meta = resolve_dataset("binaryinferno", "dhcp_1000")
raw = load_pcap(meta["file"], Config())
cleaned, _, _ = clean_protocol_messages(raw.messages, "dhcp", 1000)
trace = Trace(messages=cleaned, pairs=raw.pairs, capture_range=raw.capture_range)
config = Config()

res = run_pipeline(trace, config, capture=True)
cap = res.trace
print("pipeline done")

pr = cProfile.Profile()
pr.enable()
mt = build_message_trace(cap, 0, config)
pr.disable()
s = io.StringIO()
ps = pstats.Stats(pr, stream=s).sort_stats("cumulative")
ps.print_stats(25)
print(s.getvalue())
