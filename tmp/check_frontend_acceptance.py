"""Verify the spec's frontend acceptance data points against the API."""
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

# 1. pipeline_trace for NetPlier/Modbus
ov = process_request({
    "cmd": "pipeline_trace",
    "input": {"kind": "dataset", "source_id": "netplier",
              "dataset_id": "modbus"},
    "config": config,
})
with open("tmp/pipeline_trace_modbus.json", "w") as f:
    json.dump(ov, f, indent=2, allow_nan=False)

print("=== acceptance: pipeline_trace netplier/modbus ===")
print("status:", ov["status"])
print("stages:", [(s["id"], s["status"]) for s in ov["stages"]])
print("stage error field present:", all("error" in s for s in ov["stages"]))

# candidates panel marks true keyword 7/1
cand = ov["candidates"]
print("true_in_pool:", cand["true_in_pool"])
pool_71 = [c for c in cand["pool"] if c["offset"] == 7 and c["length"] == 1]
print("pool has 7/1:", bool(pool_71), pool_71[:1])

# stage1 / stage2 tables: true keyword 7/1 marked is_true
for d in ("c2s", "s2c"):
    s1 = ov["stage1"].get(d, {})
    true_rows = [r for r in s1.get("rows", []) if r["is_true"]]
    print(f"stage1.{d} is_true rows:", [(r["offset"], r["length"], r["rank"]) for r in true_rows])
    s2 = ov["stage2"].get(d, {})
    true_rows2 = [r for r in s2.get("rows", []) if r["is_true"]]
    print(f"stage2.{d} is_true rows:", [(r["offset"], r["length"], r["rank"]) for r in true_rows2])
    print(f"stage2.{d} winner:", s2.get("winner"))

# 2. message_trace for message 0
mt = process_request({
    "cmd": "message_trace",
    "input": {"kind": "dataset", "source_id": "netplier",
              "dataset_id": "modbus"},
    "config": config,
    "message_id": 0,
})
with open("tmp/message_trace_modbus_0.json", "w") as f:
    json.dump(mt, f, indent=2, allow_nan=False)

print()
print("=== acceptance: message_trace msg 0 ===")
print("status:", mt["status"])
sparse_rows = [r for r in mt["rules"] if r["rule"] == "sparse"]
print("sparse rule rows:", [(r["offset"], r["length"], r["fires"], r["msg_ok"]) for r in sparse_rows])
byte7 = [b for b in mt["bytes"] if b["offset"] == 7]
print("byte 7:", byte7)
cand_71 = [c for c in mt["candidate_path"] if c["offset"] == 7 and c["length"] == 1]
print("candidate_path 7/1:", bool(cand_71))
if cand_71:
    c = cand_71[0]
    print("  value:", c["value"], "cluster_key:", c["cluster_key"],
          "cluster_size:", c["cluster_size"])
    print("  stage1:", {k: round(v, 4) if isinstance(v, float) else v for k, v in c["stage1"].items()})
    print("  stage2:", c["stage2"] is not None)

# 3. custom Fig 1 trace
FIG1_HEX = """05 64 0b c4 44 33 33 44 ac d1 c6 c5 01 3c 00 00 93 24 Read
05 64 0a 44 33 44 44 33 6e 25 e0 c5 81 00 00 02 ee Response
05 64 0b c4 44 33 33 44 ac d1 c7 c6 01 3c 00 00 7e f4 Read
05 64 0a 44 33 44 44 33 6e 25 e1 c6 81 00 00 45 c7 Response
05 64 0b c4 44 33 33 44 ac d1 c8 c7 02 50 01 2b 00 00 Write
05 64 0a 44 33 44 44 33 6e 25 e2 c7 81 00 00 a7 60 Response
05 64 0d c4 44 33 33 44 6d c3 c6 c6 02 50 01 00 00 00 00 34 Write
05 64 0b 44 33 44 44 33 7c ae c6 c6 81 00 00 00 36 71 Response"""

ov_fig1 = process_request({
    "cmd": "pipeline_trace",
    "input": {"kind": "custom", "text": FIG1_HEX},
    "config": config,
})
print()
print("=== acceptance: custom Fig 1 trace ===")
print("status:", ov_fig1["status"])
print("n_messages:", ov_fig1["meta"]["n_messages"])
print("stages:", [(s["id"], s["status"]) for s in ov_fig1["stages"]])
print("boundary B:", ov_fig1["boundary"]["B"])
mt_fig1 = process_request({
    "cmd": "message_trace",
    "input": {"kind": "custom", "text": FIG1_HEX},
    "config": config,
    "message_id": 0,
})
print("fig1 message_trace status:", mt_fig1["status"])
print("fig1 msg 0 bytes:", len(mt_fig1["bytes"]))
print("fig1 msg 0 rules:", len(mt_fig1["rules"]))
print("fig1 msg 0 candidate_path:", len(mt_fig1["candidate_path"]))
