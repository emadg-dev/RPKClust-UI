import json

mt = json.load(open("tmp/message_trace_modbus_0.json", encoding="utf-8"))

print("message:", mt["message"])
print()
print("first 8 bytes:")
for b in mt["bytes"][:8]:
    print(" ", b["offset"], b["hex"], b["region"], b["status"],
          "tags=", b["tags"], "in_S=", b["in_S"],
          "cands=", b["candidate_ids"])
print()
print("rules (first 12):")
for r in mt["rules"][:12]:
    print("  %s@%d/%d fires=%s msg_ok=%s blocking=%s frac=%.2f" % (
        r["rule"], r["offset"], r["length"], r["fires"],
        r["msg_ok"], r["blocking"], r["fraction_ok"]))
print("  ... total rules:", len(mt["rules"]))
print()
print("candidate_path:")
for p in mt["candidate_path"]:
    print("  id=%d %d/%d %s value=%s clus_size=%d n_clus=%d s1rank=%s winner=%s" % (
        p["candidate_id"], p["offset"], p["length"], p["region"],
        p["value"], p["cluster_size"], p["n_clusters"],
        p["stage1"]["rank"] if p["stage1"] else None, p["is_winner"]))
print()
print("final:", mt["final"])
print("offset_hist keys:", sorted(mt["offset_histograms"].keys(), key=int))
print("hist[7]:", mt["offset_histograms"]["7"])
