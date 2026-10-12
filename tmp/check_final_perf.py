"""Final Phase B performance report: cache-cold timings,
stage breakdown, and response sizes."""
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


def timed(req):
    t0 = time.perf_counter()
    res = process_request(req)
    return res, time.perf_counter() - t0


for dataset_id in ("modbus_1000", "dhcp_1000"):
    # cold cache
    if os.path.isdir(CACHE):
        shutil.rmtree(CACHE)
    ov, t_ov = timed({
        "cmd": "pipeline_trace",
        "input": {"kind": "dataset", "source_id": "binaryinferno",
                  "dataset_id": dataset_id, "max_messages": 1000},
        "config": config,
    })
    stages = {s["id"]: s["ms"] for s in ov["stages"]}
    mt, t_mt = timed({
        "cmd": "message_trace",
        "input": {"kind": "dataset", "source_id": "binaryinferno",
                  "dataset_id": dataset_id, "max_messages": 1000},
        "config": config,
        "message_id": 0,
    })
    ov_json = json.dumps(ov, allow_nan=False)
    mt_json = json.dumps(mt, allow_nan=False)
    print(f"=== {dataset_id} (cold cache) ===")
    print(f"  pipeline_trace: {t_ov:.2f}s  "
          f"stages(ms): {stages}")
    print(f"  message_trace:  {t_mt:.2f}s  "
          f"rules={len(mt['rules'])} bytes={len(mt['bytes'])}")
    print(f"  overview JSON:  {len(ov_json)/1e6:.2f} MB")
    print(f"  msgtrace JSON:  {len(mt_json)/1e6:.2f} MB")
    print(f"  consistency ok: {ov['consistency']['ok']}")
