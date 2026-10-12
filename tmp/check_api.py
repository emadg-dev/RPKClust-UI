import json, sys
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

FIG1 = """05 64 0b c4 44 33 33 44 ac d1 c6 c5 01 3c 00 00 93 24 Read
05 64 0a 44 33 44 44 33 6e 25 e0 c5 81 00 00 02 ee Response
05 64 0b c4 44 33 33 44 ac d1 c7 c6 01 3c 00 00 7e f4 Read
05 64 0a 44 33 44 44 33 6e 25 e1 c6 81 00 00 45 c7 Response
05 64 0b c4 44 33 33 44 ac d1 c8 c7 02 50 01 2b 00 00 Write
05 64 0a 44 33 44 44 33 6e 25 e2 c7 81 00 00 a7 60 Response
05 64 0d c4 44 33 33 44 6d c3 c6 c6 02 50 01 00 00 00 00 34 Write
05 64 0b 44 33 44 44 33 7c ae c6 c6 81 00 00 00 36 71 Response"""

# 1. custom trace pipeline_trace
ov = process_request({
    "cmd": "pipeline_trace",
    "input": {"kind": "custom", "text": FIG1},
    "config": config,
})
print("custom pipeline_trace:", ov["status"])
print("  stages:", [(s["id"], s["status"]) for s in ov["stages"]])
print("  boundary B:", ov["boundary"]["B"], "min_len:", ov["boundary"]["min_len"])
print("  pool:", [(c["offset"], c["length"]) for c in ov["candidates"]["pool"]])
print("  true_in_pool:", ov["candidates"]["true_in_pool"])
print("  metrics:", ov["metrics"]["available"])

# 2. custom message_trace for message 0
mt = process_request({
    "cmd": "message_trace",
    "input": {"kind": "custom", "text": FIG1},
    "config": config,
    "message_id": 0,
})
print("custom message_trace:", mt["status"])
b12 = mt["bytes"][12]
print("  byte 12:", b12["hex"], b12["status"], "tags=", b12["tags"], "in_S=", b12["in_S"])
rule = [r for r in mt["rules"] if r["rule"] == "sparse" and r["offset"] == 12 and r["length"] == 1]
print("  sparse@12/1:", rule[0]["fires"], rule[0]["msg_ok"])

# 3. missing dataset -> error envelope
err = process_request({
    "cmd": "pipeline_trace",
    "input": {"kind": "dataset", "source_id": "netplier", "dataset_id": "nope"},
    "config": config,
})
print("missing dataset:", err["status"], "-", err.get("message"))

# 4. unknown message id -> error envelope
err2 = process_request({
    "cmd": "message_trace",
    "input": {"kind": "custom", "text": FIG1},
    "config": config,
    "message_id": 999,
})
print("unknown message:", err2["status"], "-", err2.get("message"))

# 5. determinism of the API layer (cache path)
mt_a = process_request({
    "cmd": "message_trace",
    "input": {"kind": "custom", "text": FIG1},
    "config": config,
    "message_id": 3,
})
mt_b = process_request({
    "cmd": "message_trace",
    "input": {"kind": "custom", "text": FIG1},
    "config": config,
    "message_id": 3,
})
print("api determinism:", json.dumps(mt_a, sort_keys=True) == json.dumps(mt_b, sort_keys=True))
