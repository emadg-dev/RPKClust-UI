import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rpkclust.config import Config
from rpkclust.catalog import resolve_dataset
from rpkclust.io.loader import load_pcap
from rpkclust.model import Trace, Message
from rpkclust.pipeline import run_pipeline

meta = resolve_dataset("netplier", "modbus")
raw = load_pcap(meta["file"], Config())

# original inline cleaning (as in the pre-change ground_truth.py)
cleaned = []
for m in raw.messages:
    data = m.data
    if len(data) >= 6:
        length = int.from_bytes(data[4:6], byteorder="big", signed=False)
        if len(data) > length + 6:
            data = data[:length + 6]
    cleaned.append(Message(id=len(cleaned), data=data, ts=m.ts, src=m.src,
                           dst=m.dst, sport=m.sport, dport=m.dport,
                           direction=m.direction, session_id=m.session_id,
                           label=None))
cleaned = cleaned[:100]
trace = Trace(messages=cleaned, pairs=raw.pairs, capture_range=raw.capture_range)
res = run_pipeline(trace, Config())
print("candidate_count:", len(res.candidates))
print("pool:", [(c.offset, c.length) for c in res.candidates])
for d, kw in res.keywords.items():
    print(d, "winner:", kw.candidate.offset, kw.candidate.length,
          "posterior:", round(kw.posterior, 6))
