# Quick Start: Running and Testing RPKClust

## Installation

### Python Backend
```bash
cd D:\Dan\00000 Arshad\MT\RPKClust\RPKClust-UI
pip install -e .              # editable install
pip install -e ".[test]"      # with test dependencies
```

### Frontend
```bash
npm install                     # installs dependencies
npm run dev                     # Vite dev server on port 3000
npm run build                   # Production build
npm run typecheck               # TypeScript type checking
```

### CLI Usage
```bash
# Run pipeline on a PCAP file
rpkclust run <input.pcap> --out out/ --config config.json --explain

# Evaluate against ground truth
rpkclust eval <input.pcap> --truth labels.csv

# Run benchmarks
rpkclust bench <dataset_dir> --sizes 100 500 1000 --out-csv results.csv
```

### API Mode
```bash
echo '{"cmd":"get_sources"}' | python -m rpkclust.api_runner
```

## How the Pipeline Flows (from raw PCAP to keywords)

```
PCAP file
    │
    ▼
rpkclust/io/loader.py
    │
    ├─ parse_pcap_packets() → raw packets
    │     └─ _parse_raw_eth_ip() → strips L2/L3 headers → application payload
    │
    └─ assigns sessions & directions (io/sessions.py)
          └─ pair_messages() → request-response pairs (used by remote coupling)
                 ▼
rpkclust/pipeline.py
    │
    ├─ Stage 1: find_boundary() → FOR-NFOR boundary B (boundary.py + detectors)
    │
    ├─ Stage 2: all_hits() → collect all semantic tags in [0,B)
    │
    ├─ Stage 3: generate_candidates() → FOR sliding windows + NFOR TLV candidates
    │
    ├─ Stage 4a: evaluate_stage1() → 4 constraints → star factor graph → p_f
    │   (per direction: c2s & s2c)
    │
    ├─ Stage 4b: evaluate_stage2() → p_bit + p_offset → combine_two_stage() → posterior
    │
    ├─ Stage 5: cluster_messages() → Dict[int, str] per direction
    │
    └─ Stage 6: evaluate_clusters_against_messages() → (h, c, v) metrics
                 ▼
Result JSON → CLI output / API response / Frontend UI
```

## Entry Points Summary

| Goal | File to Run | Key Function |
|---|---|---|
| CLI on PCAP | `rpkclust run <pcap>` | `cli.py` → `run_pipeline()` |
| Evaluate with labels | `rpkclust eval <pcap>` | `cli.py` → `run_pipeline()` + `metrics.py` |
| Frontend UI | `npm run dev` | Frontend → `POST /api/run` → `api_runner.py` |
| Custom hex input | `rpkclust run <hex_file>` or `api_runner` cmd `run_custom` | `cli.py` → `load_hex_lines()` |
| Benchmark datasets | `rpkclust bench <dir>` | `cli.py` → `bench` command (partially implemented) |
| API query | `echo '{"cmd":"run_dataset",...}' \| python -m rpkclust.api_runner` | `api_runner.py` → `process_request()` |

## Testing

```bash
pytest tests/                              # all 22 tests
pytest tests/test_boundary.py              # boundary detection
pytest tests/test_fig1_pipeline.py -v      # end-to-end toy trace
```

## Key Files Reference Map

| Concern | File(s) |
|---|---|
| How PCAP is parsed | `rpkclust/io/loader.py`, `_parse_raw_eth_ip()` |
| How boundary B is detected | `rpkclust/boundary.py`, `detectors/` (6+2 rules) |
| How candidates are generated | `rpkclust/candidates/for_region.py`, `nfor_tlv.py` |
| How keywords are inferred | `rpkclust/constraints/stage1.py`, `stage2.py`, `posterior.py` |
| How messages are clustered | `rpkclust/cluster.py` |
| How H/C/V metrics are computed | `rpkclust/metrics.py` |
| How frontend talks to backend | `api_runner.py`, `vite.config.ts` |
| All hyperparameters | `rpkclust/config.py` |
| Data models | `rpkclust/model.py` |

## Navigation Tip

If you're new to the codebase:
1. **Start with `rpkclust/model.py`** — understand the data structures
2. **Then `rpkclust/config.py`** — understand all the knobs and dials
3. **Then `rpkclust/pipeline.py`** — see how they fit together
4. **Drill into each stage module** as needed

If you're adding a new detector, modifying a constraint, or extending the pipeline, follow the **Common Tasks** in AGENTS.md:
- Adding detector → `rpkclust/detectors/`
- Adding config param → `rpkclust/config.py` + UI update in `src/App.tsx`
- Modifying pipeline → relevant stage file + `pipeline.py` update