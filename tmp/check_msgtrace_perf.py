"""message_trace wall time for modbus_1000 and dhcp_1000."""
import json
import sys
import time

sys.path.insert(0, ".")
from rpkclust.api_runner import process_request

config = {
    "fo_lengths_for_candidates": [1, 2, 4],
    "sparse_ratio": 0.02,
    "stage1_top_k": 5,
    "sim_sample_size": 200,
    "pos_for": [0.95, 0.01, 0.70],
    "pos_nfor": 0.60,
    "bituse_endian": "big",
    "for_exclude_rules": ["constant", "sequence", "timestamp",
                          "float", "length", "checksum", "address"],
}

for dataset_id in ("modbus_1000", "dhcp_1000"):
    t0 = time.perf_counter()
    mt = process_request({
        "cmd": "message_trace",
        "input": {"kind": "dataset", "source_id": "binaryinferno",
                  "dataset_id": dataset_id, "max_messages": 1000},
        "config": config,
        "message_id": 0,
    })
    dt = time.perf_counter() - t0
    print(f"{dataset_id}: message_trace wall time {dt:.2f}s "
          f"(status={mt['status']}, rules={len(mt['rules'])}, "
          f"bytes={len(mt['bytes'])})")
