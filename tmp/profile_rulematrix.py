import cProfile, pstats, sys, io
sys.path.insert(0, ".")
from rpkclust.config import Config
from rpkclust.catalog import resolve_dataset
from rpkclust.io.loader import load_pcap
from rpkclust.eval.ground_truth import clean_protocol_messages
from rpkclust.model import Trace
from rpkclust.pipeline import run_pipeline
from rpkclust.trace import _rule_matrix

meta = resolve_dataset("binaryinferno", "dhcp_1000")
raw = load_pcap(meta["file"], Config())
cleaned, _, _ = clean_protocol_messages(raw.messages, "dhcp", 1000)
trace = Trace(messages=cleaned, pairs=raw.pairs, capture_range=raw.capture_range)
config = Config()

res = run_pipeline(trace, config, capture=True)
cap = res.trace
print("pipeline done, min_len =", cap.boundary.min_len)

pr = cProfile.Profile()
pr.enable()
matrix = _rule_matrix(cap.messages, config, cap.pairs, cap.capture_range,
                      cap.boundary.min_len)
pr.disable()
s = io.StringIO()
ps = pstats.Stats(pr, stream=s).sort_stats("tottime")
ps.print_stats(15)
print(s.getvalue())
print("matrix entries:", len(matrix))
