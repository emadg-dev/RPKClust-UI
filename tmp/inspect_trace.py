import json

ov = json.load(open("tmp/pipeline_trace_modbus.json", encoding="utf-8"))

print("=== c2s stage1 (pipeline_trace) ===")
print("cand | #clus | #dist | sing | p_m | p_r | p_s | p_d | p_f | rank")
for r in ov["stage1"]["c2s"]["rows"]:
    print("%d/%d | %d | %d | %d | %.4f | %.4f | %.4f | %.2f | %.4f | %d" % (
        r["offset"], r["length"], r["n_clusters"], r["n_distinct"],
        r["singletons"], r["p_m"], r["p_r"], r["p_s"], r["p_d"], r["p_f"], r["rank"]))

print()
print("=== c2s stage2 ===")
for r in ov["stage2"]["c2s"]["rows"]:
    print("%d/%d | p_bit=%.4f | p_offset=%.2f | p_f=%.4f | posterior=%.6f | s1rank=%s" % (
        r["offset"], r["length"], r["p_bit"], r["p_offset"], r["p_f"], r["posterior"], r["stage1_rank"]))
print("winner:", ov["stage2"]["c2s"]["winner"])

print()
print("=== s2c stage1 ===")
for r in ov["stage1"]["s2c"]["rows"]:
    print("%d/%d | %d | %d | %d | %.4f | %.4f | %.4f | %.2f | %.4f | %d" % (
        r["offset"], r["length"], r["n_clusters"], r["n_distinct"],
        r["singletons"], r["p_m"], r["p_r"], r["p_s"], r["p_d"], r["p_f"], r["rank"]))
print("s2c winner:", ov["stage2"]["s2c"]["winner"])

print()
print("=== cluster c2s ===")
print(ov["cluster"]["c2s"]["keyword"], "n_clusters:", len(ov["cluster"]["c2s"]["clusters"]))
print("=== metrics ===")
print(ov["metrics"]["homogeneity"], ov["metrics"]["completeness"], ov["metrics"]["v_measure"])
print("=== timing (ms) ===")
print({s["id"]: s["ms"] for s in ov["stages"]})
