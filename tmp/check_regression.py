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

# run_dataset (now uses shared cleaning -> labels extracted)
res = process_request({
    "cmd": "run_dataset",
    "source_id": "netplier",
    "dataset_id": "modbus",
    "config": config,
})
print("run_dataset:", res["status"])
print("  boundary B:", res["boundary"]["B"])
print("  keywords c2s:", res["keywords"]["c2s"]["offset"], res["keywords"]["c2s"]["length"],
      "posterior:", round(res["keywords"]["c2s"]["posterior"], 6))
print("  sample msg 0 label:", res["sample_messages"][0]["label"])
print("  benchmark v_measure:", round(res["benchmark"]["v_measure"], 4))

# benchmark_all still works
bench = process_request({
    "cmd": "benchmark_all",
    "source_id": "netplier",
    "config": config,
})
print("benchmark_all:", bench["status"], "results:", len(bench["benchmarks"]))
for b in bench["benchmarks"][:3]:
    print("  ", b["protocol"], "B=", b["boundary_B"], "v=", round(b["v_measure"], 4),
          "cands=", b["candidate_count"])

# get_sources
src = process_request({"cmd": "get_sources"})
print("get_sources:", src["status"], "sources:", list(src["catalog"].keys()))
