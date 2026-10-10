# RPKClust-UI

**Region-Partitioned Keywords Inference for Binary Protocol Reverse Engineering**

A research tool and interactive dashboard for automatically inferring protocol keyword fields from binary network protocol captures (PCAP files) without requiring global multiple sequence alignment (MSA).

Published in *The Computer Journal* (2025).

## Overview

RPKClust infers keyword fields from binary protocol messages through a multi-stage pipeline:

1. **FOR-NFOR Boundary Detection** — identifies the maximal boundary between the Fixed-Offset Region (FOR) and Non-Fixed-Offset Region (NFOR) using semantic detectors.
2. **Candidate Generation** — generates keyword field candidates from FOR (sliding windows) and NFOR (TLV pattern detection).
3. **Two-Stage Probability Inference** — Stage 1 evaluates clustering constraints (similarity, coupling, structure, dimension) via a star factor graph; Stage 2 evaluates self-constraints (bit-use, position) and combines them into a final posterior.
4. **Message Clustering** — groups protocol messages by inferred keyword values.
5. **Evaluation** — computes Homogeneity, Completeness, and V-measure against ground truth.

The UI provides an interactive dashboard for exploring benchmarks across 4 data sources (27+ datasets) with hyperparameter tuning controls.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python >=3.10, numpy, scipy, scikit-learn, scapy |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| Icons | lucide-react |
| Animations | motion (Framer Motion) |
| AI | @google/genai (Gemini) |

## Project Structure

```
├── src/                        # React/TypeScript frontend
│   ├── main.tsx                # React entry point
│   ├── App.tsx                 # Main application UI
│   └── index.css               # Tailwind CSS entry
├── rpkclust/                   # Python backend package
│   ├── model.py                # Core dataclasses
│   ├── config.py               # Hyperparameter configuration
│   ├── pipeline.py             # End-to-end pipeline orchestration
│   ├── boundary.py             # FOR-NFOR boundary detection
│   ├── candidates/             # Candidate generation (FOR + NFOR TLV)
│   ├── constraints/            # Two-stage probability inference
│   ├── detectors/              # Semantic field detectors
│   ├── io/                     # PCAP parsing & session tracking
│   ├── eval/                   # Ground truth & benchmark runner
│   ├── cluster.py              # Message clustering
│   ├── metrics.py              # H/C/V-measure metrics
│   ├── catalog.py              # Dataset catalog
│   ├── cli.py                  # CLI commands
│   └── api_runner.py           # JSON stdin/stdout API for frontend
├── tests/                      # Pytest test suite
├── data/                       # PCAP datasets (1 source)
│   └── netplier/               #   7 NetPlier benchmark PCAPs
├── docs/
│   └── DECISIONS.md            # Design decisions (D-01 through D-B3)
├── ASSUMPTIONS.md              # Mathematical assumptions & defaults
├── BENCHMARKS.md               # Multi-source evaluation results
├── pyproject.toml              # Python package config
├── vite.config.ts              # Vite build config + API middleware
└── tsconfig.json               # TypeScript configuration
```

## Installation

### Python Backend

```bash
pip install -e .              # editable install
pip install -e ".[test]"      # with test dependencies
```

### Frontend

```bash
npm install
```

## Usage

### CLI

```bash
# Run pipeline on a PCAP file
rpkclust run <input.pcap> --out out/ --config config.json --explain

# Evaluate against ground truth
rpkclust eval <input.pcap> --truth labels.csv

# Run benchmarks
rpkclust bench <dataset_dir> --sizes 100 500 1000 --out-csv results.csv
```

### Web Dashboard

```bash
npm run dev        # Vite dev server on port 3000
npm run build      # Production build
npm run preview    # Preview production build
```

The Vite dev server includes a custom API middleware that bridges the React frontend to the Python backend via `POST /api/run`.

### API Mode

```bash
echo '{"cmd":"get_sources"}' | python -m rpkclust.api_runner
```

## Testing

```bash
pytest tests/
```

7 test files covering boundary detection, candidate generation, all 8 semantic detectors, end-to-end pipeline, config serialization, and both inference stages.

## Environment Variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Gemini AI API key (injected by AI Studio) |
| `APP_URL` | Hosted URL for self-referential links |
| `DISABLE_HMR` | Set to `true` to disable Hot Module Replacement |

See `.env.example` for the template.

## Documentation

- [ASSUMPTIONS.md](ASSUMPTIONS.md) — Mathematical assumptions and defaults
- [BENCHMARKS.md](BENCHMARKS.md) — Multi-source evaluation results and dataset catalog
- [docs/DECISIONS.md](docs/DECISIONS.md) — Design decisions for underspecified paper parameters
