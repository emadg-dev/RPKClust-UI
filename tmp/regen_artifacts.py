"""Regenerate the Phase B spec artifacts (netplier modbus)."""
import json
import sys

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

ov = process_request({
    "cmd": "pipeline_trace",
    "input": {"kind": "dataset", "source_id": "netplier",
              "dataset_id": "modbus"},
    "config": config,
})
with open("tmp/pipeline_trace_modbus.json", "w") as f:
    json.dump(ov, f, indent=2, allow_nan=False)
print("pipeline_trace_modbus.json:", ov["status"],
      len(json.dumps(ov)), "bytes")

mt = process_request({
    "cmd": "message_trace",
    "input": {"kind": "dataset", "source_id": "netplier",
              "dataset_id": "modbus"},
    "config": config,
    "message_id": 0,
})
with open("tmp/message_trace_modbus_0.json", "w") as f:
    json.dump(mt, f, indent=2, allow_nan=False)
print("message_trace_modbus_0.json:", mt["status"],
      len(json.dumps(mt)), "bytes")
