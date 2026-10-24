# rpkclust/cli.py — Command Line Interface

## Docstring (line 2)
"""CLI commands: run, eval, bench."""

## Imports (lines 6-15)
`argparse`, `sys`, `os`, `json`, `csv`, module imports from rpkclust.

## main() (line 16)
Creates subparsers: `run`, `eval`, `bench`.

### run_parser (line 21-25)
Arguments: `input` (path), `--out` default `"out"`, `--config` (JSON config file path), `--explain` (action store_true).

### run execution (lines 40-91)
1. Load config from file if provided (defaults `Config()`).
2. Detect file extension: `.pcap`/`.pcapng`/`.cap` → `load_pcap`; `.csv` → `load_csv`; else `load_hex_lines`.
3. Print loaded message/pair count.
4. Call `run_pipeline(trace, cfg, output_dir=args.out)`.
5. Print `B`, min_len, semantic hits count, candidate count.
6. For each direction keyword with `kw.candidate`: print region, offset, length, TLV hex info, posterior, and sub-probabilities (`p_f`, `p_bit`, `p_offset`).
7. Cluster count.
8. If metrics non-None: print H/C/V.
9. If `--explain`: print header divider, timing breakdown (`timing` dict), semantic hits list (`rule`/`offset`/`len`/`info`), and full ranking table per direction (offset, length, region, kind, post, p_f, p_bit, p_offset, sort=#).

### eval_parser (line 28-36)
Arguments: `input`, `--truth` (required CSV file `index,label`).

### eval execution (lines 93-122)
1. Load input (same extension detection).
2. Load truth labels from CSV (first column numeric id, second label). Skip malformed rows.
3. Run pipeline.
4. Filter messages with `label is not None`. Build `y_true` (`"{dir}_{label}"`) and `y_pred` (`clusters[m_id]`).
5. Call `compute_metrics(y_true, y_pred)`.
6. Print message count and H/C/V values.

### bench_parser (line 33-36)
Arguments: `dataset_dir`, `--sizes` (default [100, 500, 1000]), `--out-csv` (default `benchmark_results.csv`).
*Note: bench command parser exists but its execution path is not fully implemented in the shown lines (main handles bench only if `args.command == "bench"`, but the bench execution block is missing in shown snippet — likely present in full file beyond line 125).* Wait: the file only shows lines 1-125. The bench execution is not shown. I will note that the bench parser is defined but its execution block is truncated in the visible file.

*Actually reading back the full file from earlier: lines 1-125. The bench execution is not shown in that snippet. The file is complete at 125 lines — there's no bench execution block shown, which is odd. However, the user asked for method-by-method explanation of what's visible; I'll describe what's present and note if truncated.*

Actually, checking the file size: 125 lines is short. The bench execution must have been omitted in my read or truncated. Given what's visible:
- The parser defines bench subparser (lines 33-36).
- In `main()`, `args.command` conditions: only `run` and `eval` are handled (lines 40, 93). There is no `elif args.command == "bench"` block shown. This implies the bench execution is either missing or truncated in my view, or not implemented in the file. Actually I see the file is exactly 125 lines — maybe bench is not implemented, or the snippet was truncated by my earlier read due to some issue. Let me verify quickly.

Wait, I should verify quickly if there's more in cli.py. I can check line count.
Actually, since the user wants explanations, I'll describe what's visible and note any truncation.

### Key design notes (line 84-91)
`--explain` prints full diagnostic tables for explainability, matching the explainability requirements in the paper (pipeline stages return diagnostic dicts).

*File truncated? The file ends at line 125; bench execution block not visible. I note that based on visible content.*

Actually, let me verify with a quick shell check.
