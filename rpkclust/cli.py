"""
Command-line interface for RPKClust.
Provides run, eval, and bench commands.
"""

import argparse
import sys
import os
import json
import csv
from rpkclust.config import Config
from rpkclust.io.loader import load_hex_lines, load_pcap, load_csv
from rpkclust.pipeline import run_pipeline
from rpkclust.metrics import compute_metrics

def main():
    parser = argparse.ArgumentParser(description="RPKClust: Region-Partitioned Keywords Inference for Binary Protocol Reverse")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # 1. run command
    run_parser = subparsers.add_parser("run", help="Run RPKClust on input pcap or hex trace")
    run_parser.add_argument("input", help="Path to PCAP file or hex-lines file")
    run_parser.add_argument("--out", default="out", help="Output directory for JSON artifacts")
    run_parser.add_argument("--config", default=None, help="Path to custom JSON configuration file")
    run_parser.add_argument("--explain", action="store_true", help="Print detailed diagnostic tables")

    # 2. eval command
    eval_parser = subparsers.add_parser("eval", help="Evaluate clustering on dataset with ground truth")
    eval_parser.add_argument("input", help="Path to input trace")
    eval_parser.add_argument("--truth", required=True, help="Path to ground truth labels CSV (index,label)")

    # 3. bench command
    bench_parser = subparsers.add_parser("bench", help="Run benchmark across datasets")
    bench_parser.add_argument("dataset_dir", help="Directory containing dataset files")
    bench_parser.add_argument("--sizes", nargs="+", type=int, default=[100, 500, 1000], help="Subset sizes")
    bench_parser.add_argument("--out-csv", default="benchmark_results.csv", help="Output CSV path")

    args = parser.parse_args()

    if args.command == "run":
        cfg = Config()
        if args.config and os.path.exists(args.config):
            with open(args.config, "r", encoding="utf-8") as f:
                cfg = Config.from_json(f.read())

        # Load input
        if args.input.endswith((".pcap", ".pcapng", ".cap")):
            trace = load_pcap(args.input, cfg)
        elif args.input.endswith(".csv"):
            trace = load_csv(args.input, cfg)
        else:
            trace = load_hex_lines(args.input, cfg)

        print(f"[*] Loaded {len(trace.messages)} messages, {len(trace.pairs)} request-response pairs.")
        result = run_pipeline(trace, cfg, output_dir=args.out)

        print(f"[+] FOR-NFOR Boundary B: {result.boundary.B} (min message length: {result.boundary.min_len})")
        print(f"[+] Semantic detector hits: {len(result.boundary.hits)}")
        print(f"[+] Generated keyword candidates: {len(result.candidates)}")

        for d_name, kw in result.keywords.items():
            if kw and kw.candidate:
                c = kw.candidate
                type_info = f" (Type: 0x{c.tlv_type.hex()})" if c.tlv_type else ""
                print(f"[+] Keyword [{d_name}]: {c.region} offset={c.offset}, len={c.length}{type_info} | Posterior P(K=1)={kw.posterior:.4f}")
                print(f"    p_f={kw.p_f:.4f}, p_bit={kw.p_bit:.4f}, p_offset={kw.p_offset:.4f}")

        num_clusters = len(set(result.clusters.values()))
        print(f"[+] Clustered into {num_clusters} message clusters.")

        if result.diagnostics["metrics"]["v_measure"] is not None:
            m = result.diagnostics["metrics"]
            print(f"[+] Evaluation Metrics: Homogeneity={m['homogeneity']:.4f}, Completeness={m['completeness']:.4f}, V-measure={m['v_measure']:.4f}")

        if args.explain:
            print("\n" + "=" * 60)
            print("EXPLANATION & DIAGNOSTICS")
            print("=" * 60)
            print(f"Timing Breakdown: {result.diagnostics['timing']}")
            print("\nSemantic Hits:")
            for h in result.boundary.hits:
                print(f"  Offset {h.offset:3d} | Len {h.length:2d} | Rule: {h.rule:12s} | Info: {h.info}")

            print("\nCandidate Ranking:")
            for d_name, kw in result.keywords.items():
                if kw:
                    print(f"\n--- Direction: {d_name} ---")
                    for idx, item in enumerate(kw.ranking):
                        c = item["candidate"]
                        print(f"  #{idx + 1:2d} Offset: {c.offset:3d} Len: {c.length:2d} Region: {c.region:4s} | Post: {item['posterior']:.4f} | p_f: {item['p_f']:.4f} | p_bit: {item['p_bit']:.4f} | p_off: {item['p_offset']:.4f}")
            print("=" * 60)

    elif args.command == "eval":
        cfg = Config()
        if args.input.endswith((".pcap", ".pcapng", ".cap")):
            trace = load_pcap(args.input, cfg)
        elif args.input.endswith(".csv"):
            trace = load_csv(args.input, cfg)
        else:
            trace = load_hex_lines(args.input, cfg)

        # Load truth labels
        truth_map = {}
        with open(args.truth, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row in reader:
                if row and len(row) >= 2:
                    try:
                        truth_map[int(row[0])] = row[1].strip()
                    except ValueError:
                        pass

        result = run_pipeline(trace, cfg)
        common_ids = [m.id for m in trace.messages if m.id in truth_map]
        y_true = [truth_map[m_id] for m_id in common_ids]
        y_pred = [result.clusters[m_id] for m_id in common_ids]

        h, c, v = compute_metrics(y_true, y_pred)
        print(f"Evaluation over {len(common_ids)} messages:")
        print(f"Homogeneity:  {h:.4f}")
        print(f"Completeness: {c:.4f}")
        print(f"V-measure:    {v:.4f}")

if __name__ == "__main__":
    main()
