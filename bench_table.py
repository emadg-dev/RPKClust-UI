"""
Benchmark table for all catalog datasets.
Usage:  py bench_table.py <label> [max_messages]
Writes: bench_<label>.csv and prints a markdown table.
"""
import os
import sys
import csv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rpkclust.config import Config
from rpkclust.catalog import SOURCES
from rpkclust.eval.ground_truth import run_benchmark_on_pcap, run_benchmark_on_csv


def fmt_kw(d):
    if not d:
        return "-"
    return f"{d['offset']}/{d['length']}"


def main():
    label = sys.argv[1] if len(sys.argv) > 1 else "run"
    max_msgs = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    cfg = Config()

    rows = []
    for src_id, src in SOURCES.items():
        for d in src["datasets"]:
            path = d["file"]
            row = {"source": src_id, "dataset": d["id"],
                   "true_kw": f"{d['true_keyword']['offset']}/{d['true_keyword']['length']}"}
            if not os.path.exists(path):
                row.update(error="file missing")
                rows.append(row)
                continue
            try:
                fn = run_benchmark_on_csv if path.endswith(".csv") else run_benchmark_on_pcap
                n = d["packets"] if src_id == "binaryinferno" else max_msgs
                r = fn(path, d["protocol"], config=cfg, max_messages=n)
                kws = r["inferred_keywords"]
                row.update(
                    B=r["boundary_B"],
                    pool=r["candidate_count"],
                    kw_c2s=fmt_kw(kws.get("c2s")),
                    kw_s2c=fmt_kw(kws.get("s2c")),
                    h=round(r["homogeneity"], 4),
                    c=round(r["completeness"], 4),
                    v=round(r["v_measure"], 4),
                    sec=round(r["timing_sec"], 2),
                )
            except Exception as e:
                row.update(error=repr(e))
            rows.append(row)

    cols = ["source", "dataset", "true_kw", "B", "pool", "kw_c2s", "kw_s2c", "h", "c", "v", "sec", "error"]
    out = f"bench_{label}.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in cols})

    print("| source | dataset | true | B | pool | c2s | s2c | h | c | v |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    for r in rows:
        print("| {source} | {dataset} | {true_kw} | {B} | {pool} | {kw_c2s} | {kw_s2c} | {h} | {c} | {v} |".format(
            **{k: r.get(k, "ERR " + r["error"] if k == "B" and "error" in r else "") for k in
               ["source", "dataset", "true_kw", "B", "pool", "kw_c2s", "kw_s2c", "h", "c", "v"]}))
    for src in ("netplier", "icsreal"):
        vs = [r["v"] for r in rows if r["source"] == src and "v" in r]
        if vs:
            print(f"\nAvg V {src}: {sum(vs)/len(vs):.4f}  (n={len(vs)})")
    print(f"\nSaved {out}")


if __name__ == "__main__":
    main()