# How to Read and Navigate the RPKClust Implementation

This is a guided reading order for understanding the codebase. Start here if you want to trace how a PCAP file goes through the entire RPKClust pipeline, from raw input to keyword inference and clustering.

---

## Phase 1: Entry Points (Where to Start)

### 1.1 `rpkclust/cli.py` — Command Line Interface
**Read first.** This shows how users invoke RPKClust from the terminal.
- `main()` — parses subcommands: `run`, `eval`, `bench`
- `run` command: loads PCAP/hex/CSV → calls `run_pipeline()` → prints boundary, candidates, keywords, metrics
- `eval` command: loads input → loads truth labels → runs pipeline → computes H/C/V metrics
- `bench` command: benchmark across dataset directory

**Key takeaway:** This is the top-level user-facing entry point. Everything else is called from here or from `api_runner.py`.

### 1.2 `rpkclust/api_runner.py` — JSON stdin/stdout API
**Read second.** This is how the React frontend talks to the Python backend via Vite middleware (`POST /api/run`).
- `process_request(data, config)` — dispatches on `cmd`: `get_sources`, `benchmark_all`, `run_dataset`, `run_custom`, `cluster_messages`, `pipeline_trace`, `message_trace`, `simulate_error`
- `_format_pipeline_output()` — serializes pipeline result to JSON for the frontend
- `_load_trace_input()` — loads and cleans protocol messages
- `main()` — reads JSON from stdin, calls process_request, writes JSON to stdout

**Key takeaway:** This bridges frontend and backend. If you're modifying how the UI receives data, start here.

---

## Phase 2: Core Pipeline (The Main Algorithm)

### 2.1 `rpkclust/pipeline.py` — Pipeline Orchestration
**Read third.** This is the heart of RPKClust. It wires all stages together.
- `run_pipeline(trace_or_messages, config, output_dir, capture)` — the main orchestrator
- `run_stage()` helper — runs each stage with timing and optional error capture
- `STAGE_IDS = ["boundary", "tagging", "candidates", "stage1", "stage2", "cluster", "metrics"]`

**Stage order:**
1. `find_boundary()` → FOR-NFOR boundary B
2. `all_hits()` → collect all semantic tags in [0, B)
3. `generate_candidates()` → FOR sliding windows + NFOR TLV candidates
4. `evaluate_stage1()` + `evaluate_stage2()` → per-direction keyword inference
5. `cluster_messages()` → assign cluster labels per message
6. `evaluate_clusters_against_messages()` → compute H/C/V metrics

**Key takeaway:** Read this to understand the overall flow. Each stage calls into its respective module.

---

## Phase 3: Stage-by-Stage Deep Dive

### 3.1 Stage 1: Boundary Detection

| File | What it does |
|---|---|
| `rpkclust/boundary.py` | Algorithm 1 — byte-by-byte scan using semantic detectors; computes `B = max(offset + length)` |
| `rpkclust/detectors/base.py` | `Context` dataclass + `Detector` Protocol (interface all detectors implement) |
| `rpkclust/detectors/registry.py` | `BOUNDARY_RULES` (6 detectors: Constant→Sequence→Timestamp→Sparse→Address→Checksum) + `EXTRA_RULES` (Float, Length) + `get_detectors()` + `all_hits()` |

**Individual detectors** (each implements `check(slices, ctx) -> Optional[Hit]`):
- `detectors/constant.py` — all byte values identical at offset
- `detectors/sequence.py` — arithmetic progression / counter
- `detectors/timestamp.py` — values within ±24h of capture window
- `detectors/sparse.py` — low-cardinality non-zero field
- `detectors/address.py` — request/response address swap pattern
- `detectors/checksum.py` — CRC/checksum algorithm match over prefix `data[:offset]`
- `detectors/float_rule.py` — plausible IEEE-754 float values
- `detectors/length_rule.py` — field value matches message length

**Reading order:** `base.py` → `registry.py` → `boundary.py` → individual detector files

---

### 3.2 Stage 2: Candidate Generation

| File | What it does |
|---|---|
| `rpkclust/candidates/__init__.py` | `generate_candidates()` — merges FOR + NFOR candidates, dedups, sorts, caps at max_candidates (64) |
| `rpkclust/candidates/for_region.py` | Algorithm 2 — FOR sliding windows (L ∈ {1,2,4}), byte tagging, exclusion/rescue logic |
| `rpkclust/candidates/nfor_tlv.py` | Algorithm 3 — NFOR TLV pattern detection, validation, T-V combined keyword extraction |

**Key flow:** `boundary.B` → semantic tagging → FOR windows + NFOR TLVs → deduplicated candidate list

---

### 3.3 Stage 3: Two-Stage Probabilistic Inference

| File | What it does |
|---|---|
| `rpkclust/constraints/stage1.py` | Stage 1 — 4 clustering constraints: similarity (EER), remote coupling, structure consistency, dimension → star factor graph posterior `p_f` |
| `rpkclust/constraints/stage2.py` | Stage 2 — self-constraints: bit-use (`p_bit`), position (`p_offset`) → combine with `p_f` for final posterior |
| `rpkclust/constraints/posterior.py` | Star factor graph math — `compute_star_posterior()` + `combine_two_stage()` |
| `rpkclust/model.py` | `Candidate.extract()` — extracts field bytes from message (FOR direct slice; NFOR TLV scans for tag+value) |

**Reading order:** `model.py` (for `Candidate.extract()`) → `constraints/posterior.py` (math foundation) → `constraints/stage1.py` → `constraints/stage2.py`

---

### 3.4 Stage 4: Clustering & Metrics

| File | What it does |
|---|---|
| `rpkclust/cluster.py` | `cluster_messages()` — groups messages by inferred keyword value per direction |
| `rpkclust/metrics.py` | `compute_metrics()` — Homogeneity, Completeness, V-measure (pure Python + sklearn fallback) |
| `rpkclust/model.py` | `evaluate_clusters_against_messages()` — filters labeled messages, delegates to `compute_metrics()` |

---

## Phase 4: Data Models & Configuration

### 4.1 `rpkclust/model.py` — Frozen Data Models
**Read early.** All core data structures live here.
- `Message` (frozen) — id, data, ts, src/dst, sport/dport, direction, session_id, label
- `Pair` (frozen) — req_id, resp_id, session_id, dt
- `Trace` (frozen) — messages, pairs, capture_range
- `Hit` (frozen) — rule, offset, length, info
- `Candidate` (frozen) — region, offset, length, kind, direction, tlv_type, endian, t_len, l_len + `extract()` method
- `BoundaryResult`, `ScoredCandidate`, `Stage1Result`, `KeywordResult`, `Result` (mutable pipeline results)

**Key convention:** Message-level structs are frozen; pipeline results are mutable (constructed incrementally).

### 4.2 `rpkclust/config.py` — Configuration Dataclass
**Read next.** All ~30+ hyperparameters in one place.
- Boundary params, candidate params, Stage 1 params, Stage 2 params, general I/O params
- `to_dict()`/`to_json()`/`from_dict()`/`from_json()` for serialization
- Referenced by nearly every module

---

## Phase 5: I/O Layer

### 5.1 `rpkclust/io/loader.py` — PCAP / Hex / CSV Loading
- `parse_pcap_packets()` — pure-Python PCAP/PCAPNG parser (zero external deps)
- `_parse_raw_eth_ip()` — strips Ethernet → IPv4 → TCP/UDP, extracts payload + endpoints
- `load_hex_lines()` — plain hex per line or TSV/CSV format
- `load_csv()` — CNN-pre format (direction/type/hex/Full columns)
- `load_pcap()` — dispatches by file extension

### 5.2 `rpkclust/io/sessions.py` — Session & Direction Assignment
- `assign_sessions_and_directions()` — groups by 4-tuple flow, splits by idle gap (300s), assigns c2s/s2c direction
- `pair_messages()` — 1:1 request-response pairing within sessions

### 5.3 `rpkclust/catalog.py` — Dataset Catalog
- `SOURCES` registry — NetPlier (7 datasets) and ICS Real (7 datasets), 7 protocols each
- `get_catalog()` / `resolve_dataset()` — lookup helpers

---

## Phase 6: Evaluation & Diagnostics

### 6.1 `rpkclust/eval/ground_truth.py` — Ground Truth & Benchmarking
- `PROTOCOL_TRUE_KEYWORDS` — hardcoded true keyword offsets per protocol (Modbus offset 7, DNP3 offset 12, etc.)
- `extract_ground_truth_label()` — extracts true label from message bytes per protocol spec
- `clean_protocol_messages()` — Modbus length truncation, SMB magic filtering, label extraction
- `run_benchmark_on_pcap()` / `run_benchmark_on_csv()` — full evaluation: load → clean → run pipeline → compute metrics

### 6.2 `rpkclust/trace.py` — Pipeline Tracker (Read-Only Diagnostics)
- `build_overview()` / `build_message_trace()` — per-message byte-level tracker for UI
- `health_checks()` — boundary warnings, pair ratios, candidate pool checks
- `consistency_check()` — recomputes Stage 1+2 to verify pipeline output matches
- `_rule_matrix()` / `_blocking_for()` — per-offset rule firing analysis

---

## Phase 7: Suggested Reading Order

```
Step 1: rpkclust/model.py           # Understand data models
Step 2: rpkclust/config.py          # Understand hyperparameters
Step 3: rpkclust/pipeline.py        # Understand overall flow (7 stages)
Step 4: rpkclust/boundary.py        # Stage 1: boundary detection
Step 5: rpkclust/detectors/base.py  # Detector interface
Step 6: rpkclust/detectors/registry.py  # Detector registry
Step 7: (any detector file)         # e.g., detectors/constant.py
Step 8: rpkclust/candidates/        # Stage 2: candidate generation
Step 9: rpkclust/constraints/posterior.py  # Stage 3 math foundation
Step 10: rpkclust/constraints/stage1.py    # Stage 3: clustering constraints
Step 11: rpkclust/constraints/stage2.py    # Stage 3: self-constraints
Step 12: rpkclust/cluster.py        # Stage 4: clustering
Step 13: rpkclust/metrics.py        # Stage 4: H/C/V metrics
Step 14: rpkclust/io/loader.py      # I/O: PCAP/hex/CSV parsing
Step 15: rpkclust/io/sessions.py    # I/O: sessions & pairing
Step 16: rpkclust/api_runner.py     # Frontend bridge API
Step 17: rpkclust/cli.py            # CLI entry point
Step 18: rpkclust/eval/ground_truth.py  # Evaluation & truth checking
Step 19: rpkclust/trace.py          # Diagnostics & pipeline tracker
```

---

## Phase 8: Key Files to Know

| File | Why It Matters |
|---|---|
| `rpkclust/pipeline.py` | Orchestrates the entire analysis pipeline |
| `rpkclust/config.py` | All tunable hyperparameters in one place |
| `rpkclust/model.py` | Core data structures shared across all stages |
| `rpkclust/api_runner.py` | Bridge between frontend and backend |
| `rpkclust/boundary.py` | FOR-NFOR boundary detection (Algorithm 1) |
| `rpkclust/candidates/` | Candidate generation (Algorithms 2 & 3) |
| `rpkclust/constraints/` | Two-stage probabilistic constraint inference |
| `rpkclust/cluster.py` | Message clustering |
| `rpkclust/metrics.py` | H/C/V evaluation metrics |
| `rpkclust/io/` | PCAP parsing, session tracking, pairing |
| `src/App.tsx` | React frontend (single-file app) |
| `vite.config.ts` | Vite build config + API middleware |

---

## Phase 9: Cross-References

- **Pipeline stages return diagnostic dicts** for explainability — preserved across all stages
- **Frozen dataclasses** for message-level structures; **mutable** for pipeline results
- **`Optional[X]`** used instead of `X | None` for Python 3.10 compatibility
- **Detectors** follow Protocol-based registry pattern — each implements `check(slices, ctx) -> Optional[Hit]`
- **TypeScript interfaces** in `src/App.tsx` mirror Python dataclass field names
- **Vite middleware** intercepts `POST /api/run` and pipes request body to `python3 -m rpkclust.api_runner`

---

## Phase 10: Where to Find the Explanation Files

All per-file explanations are saved in `D:\Dan\00000 Arshad\MT\RPKClust\RPKClust-UI\explanation\`:

- `__init__.py.md`, `model.py.md`, `config.py.md`, `pipeline.py.md`, `boundary.py.md`, `catalog.py.md`, `cli.py.md`, `metrics.py.md`, `io_init.py.md`, `io_loader.py.md`, `io_sessions.py.md`, `constraints_init.py.md`, `constraints_posterior.py.md`, `constraints_stage1.py.md`, `constraints_stage2.py.md`, `candidates_init.py.md`, `candidates_for_region.py.md`, `candidates_nfor_tlv.py.md`
- `detectors_base.py.md`, `detectors_registry.py.md`, `detectors_constant.py.md`, `detectors_sequence.py.md`, `detectors_timestamp.py.md`, `detectors_sparse.py.md`, `detectors_address.py.md`, `detectors_checksum.py.md`, `detectors_float_rule.py.md`, `detectors_length_rule.py.md`
- `protocol_usage_in_pipeline.md` — analysis of whether protocol-specific PCAP knowledge is used in the core pipeline (it is NOT; only in evaluation)
