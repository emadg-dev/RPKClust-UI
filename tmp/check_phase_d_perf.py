"""Phase D: performance numbers for 100/500/1000 messages (cold cache)."""
import json
import os
import shutil
import sys
import tempfile
import time

sys.path.insert(0, ".")
from rpkclust.api_runner import process_request

CACHE = os.path.join(tempfile.gettempdir(), "rpkclust_trace_cache")

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

CASES = [
    (100, "netplier", "modbus"),
    (500, "binaryinferno", "modbus_1000"),
    (1000, "binaryinferno", "modbus_1000"),
]

print(f"{'msgs':>5} | {'pipeline_trace':>14} | {'message_trace':>13} | {'ov KB':>7} | {'mt KB':>7} | stages (ms)")
for n, src, ds in CASES:
    if os.path.isdir(CACHE):
        shutil.rmtree(CACHE)
    t0 = time.perf_counter()
    ov = process_request({
        "cmd": "pipeline_trace",
        "input": {"kind": "dataset", "source_id": src,
                  "dataset_id": ds, "max_messages": n},
        "config": config,
    })
    t_ov = time.perf_counter() - t0
    ov_kb = len(json.dumps(ov)) / 1000.0

    if os.path.isdir(CACHE):
        shutil.rmtree(CACHE)
    t1 = time.perf_counter()
    mt = process_request({
        "cmd": "message_trace",
        "input": {"kind": "dataset", "source_id": src,
                  "dataset_id": ds, "max_messages": n},
        "config": config,
        "message_id": 0,
    })
    t_mt = time.perf_counter() - t1
    mt_kb = len(json.dumps(mt)) / 1000.0

    stages = " ".join(f"{s['id']}={s['ms']:.0f}" for s in ov["stages"])
    print(f"{n:>5} | {t_ov:>13.2f}s | {t_mt:>12.2f}s | {ov_kb:>6.1f}K | {mt_kb:>6.1f}K | {stages}")
    assert ov["status"] == "ok" and mt["status"] == "ok"
