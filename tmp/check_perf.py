import json, sys, time
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
    "for_exclude_rules": ["constant", "sequence", "timestamp", "float", "length", "checksum", "address"],
}

# 1000-message dataset (binaryinferno modbus_1000)
t0 = time.perf_counter()
ov = process_request({
    "cmd": "pipeline_trace",
    "input": {"kind": "dataset", "source_id": "binaryinferno",
              "dataset_id": "modbus_1000", "max_messages": 1000},
    "config": config,
})
t_total = time.perf_counter() - t0
print("1000-msg overview status:", ov["status"])
print("total wall time: %.2fs" % t_total)
print("stage ms:", {s["id"]: s["ms"] for s in ov["stages"]})
print("messages:", ov["meta"]["n_messages"])
print("consistency ok:", ov["consistency"]["ok"])

# message_trace timing (includes rule matrix)
t1 = time.perf_counter()
mt = process_request({
    "cmd": "message_trace",
    "input": {"kind": "dataset", "source_id": "binaryinferno",
              "dataset_id": "modbus_1000", "max_messages": 1000},
    "config": config,
    "message_id": 0,
})
t_msg = time.perf_counter() - t1
print("1000-msg message_trace wall time: %.2fs" % t_msg)
print("rules:", len(mt["rules"]), "bytes:", len(mt["bytes"]))
