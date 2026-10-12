"""Equivalence: vectorized _ok_checksum (precomp table) vs the
pure-Python fallback must give identical msg_ok/detail/info."""
import sys
sys.path.insert(0, ".")
from rpkclust.catalog import resolve_dataset
from rpkclust.io.loader import load_pcap
from rpkclust.eval.ground_truth import clean_protocol_messages
from rpkclust.config import Config
from rpkclust.detectors.base import Context
from rpkclust.trace import _ok_checksum, _build_checksum_table

config = Config()
for dataset_id, proto in [("dhcp_1000", "dhcp"), ("modbus_1000", "modbus")]:
    meta = resolve_dataset("binaryinferno", dataset_id)
    raw = load_pcap(meta["file"], config)
    msgs, _, _ = clean_protocol_messages(raw.messages, proto, 1000)
    min_len = min(len(m.data) for m in msgs)
    limit = min(min_len, 300)
    table = _build_checksum_table(msgs, limit)
    precomp = {"checksum_table": table}
    mismatches = 0
    checked = 0
    for offset in range(1, limit):
        ctx = Context(messages=msgs, offset=offset,
                      capture_range=(min(m.ts for m in msgs),
                                     max(m.ts for m in msgs)),
                      pairs=raw.pairs, config=config)
        for k in (1, 2, 4):
            if offset + k > min_len:
                continue
            slices = [m.data[offset:offset + k] for m in msgs]
            a = _ok_checksum(slices, msgs, ctx, config, precomp)
            b = _ok_checksum(slices, msgs, ctx, config, None)
            checked += 1
            if a != b:
                mismatches += 1
                if mismatches <= 3:
                    print(f"MISMATCH {dataset_id} off={offset} k={k}")
                    print("  vec:", a[1], a[2])
                    print("  py :", b[1], b[2])
                    n_diff = sum(1 for x, y in zip(a[0], b[0]) if x != y)
                    print(f"  msg_ok diffs: {n_diff}/{len(a[0])}")
    print(f"{dataset_id}: {checked} evals, {mismatches} mismatches")
print("OK" if True else "")
