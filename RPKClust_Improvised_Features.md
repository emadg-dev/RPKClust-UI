# RPKClust — Improvised Components & Deviations from the Published Paper

> **Sources:** Paper (`D:\Dan\00000 Arshad\MT\RPKClust\RPKClust.pdf`, COMPJ-2025-06-0786), `docs/V2-PIPELINE.md`, `docs/V2-DECISIONS.md` (D-01…D-22), `ASSUMPTIONS.md`, `BENCHMARKS.md`, and the full implementation (`rpkclust/` + `src/`).

---

## 1. Algorithmic / Mathematical Deviations (documented in `V2-DECISIONS.md`)

These are places where the V2 implementation improvs, hardens, or interprets the paper's mathematics:

| Decision | Paper state / gap | Implementation improv |
|---|---|---|
| **D-01** | No explicit statement | Boundary computed per-direction (`boundary_per_direction`), with shared-scan option; NetPlier inferred per side. |
| **D-02** | "Variable sliding window" | `fo_lengths_for_candidates = (1,2,4)` — restricted to standard binary field sizes. |
| **D-03** | "Boundary Dynamic Expansion" likely mentioned | Not implemented in v1; hook `expand_boundary()` returns boundary unchanged. |
| **D-04** | TLV layout unspecified | Grid over `t_len/l_len ∈ {1,2}`, both endians; default `(1,1,"big")`; `tlv_auto_params` toggle. |
| **D-05** | Bit-level keywords (e.g. NTP mode bits 5–7) | Sub-byte keywords unsupported; handled only via bit-use detector, not as primary keyword. |
| **D-06** | Factor graph described | Stage-1 posterior closed form via star graph (`g_1/g_0` marginals). |
| **D-07** | Core thesis | Alignment-free surrogates: FOR positional match + NFOR `SequenceMatcher`; structure via length variance. |
| **D-08** | LEN filtered by semantics | Length detector ADDED; excluded from FOR candidate rules. |
| **D-B1–B3** | Bit-use equations unclear | Bit-use MSB skips zero values; `D_max` re-derived; `Q(k)` over full value multiset. |
| **D-09** | Factor-graph constants unstated | `p_arrow`/`p_back` hardcoded from NetPlier; `config.p_imp` removed. |
| **D-10** | Boundary interpretation ambiguous | V2 adopts **exclusive** `B = max(offset + length)`; toy trace: keyword at offset 12 → B ≥ 13. |
| **D-11** | Detector list | Float + Length excluded from boundary by default; only 6 rules in `BOUNDARY_RULES`. |
| **D-12** | NFOR keyword definition | Combined **T-V** (type + value) used as keyword; `extract()` returns T-V bytes. |
| **D-13** | — | `t_len`/`l_len` stored explicitly (no guessing heuristic). |
| **D-14** | — | Cardinality pre-filter disabled by default (Stage-1 dimension constraint handles it). |
| **D-15** | — | TLV grid search behind flag; default fixed params. |
| **D-16** | — | Stage-1 min-max normalization off by default (`stage1_normalize=False`). |
| **D-17** | — | Probability clamping via `prob_clip` config; default only numeric guard (1e-12). |
| **D-18** | D_max interpretation | Two modes: `max_over_m` (default) / `m_equals_msb`. |
| **D-19** | — | Bit-use endianness via `config.bituse_endian`. |
| **D-20** | Eq. 6 (`D`) undefined | Checksum evaluated over prefix `data[:offset]` as default range. |
| **D-21** | — | Cluster labels per-direction by default; `"global"` mode available. |
| **D-22** | — | `stage1_top_k` defaults to 5 (paper showed 3 ranks; 5 in documented range). |

---

## 2. Improvised Pipeline Machinery (NOT in the paper)

### 2.1 Added `tagging` Stage (split from boundary)

- **Paper:** Algorithm 1 only needed first-match boundary detection.
- **Improvised:** `pipeline.py` introduced a **tagging** stage (`STAGE_IDS = ["boundary", "tagging", "candidates", "stage1", "stage2", "cluster", "metrics"]`) that collects **ALL** semantic tags via `all_hits()` at offsets `[0..B)` for candidate filtering, while `B` still comes from first-match scan.

### 2.2 Candidate Diagnostics Improv

- **Paper:** Candidate generation described conceptually.
- **Improvised:** `cand_diagnostics` added — `for_diagnostics`, `exclusion_reasons`, `sparse_bytes`, `available_S` (set), `for_count`, `nfor_count`, and drop counters (`constant_window`, `cardinality`, `not_aligned`, `not_continuous`, `short_message`, `beyond_boundary`).

### 2.3 Pipeline Error Handling & Capture

- **Paper:** No capture/error semantics.
- **Improvised:** `run_stage()` with `capture=True` records errors and skips downstream stages; `PipelineCapture` dataclass; JSON artifacts exported (`03_boundary.json`, `04_candidates.json`, `keywords.json`, `clusters.json`).

### 2.4 Per-Direction Inference

- **Paper:** Mentioned keywords per side.
- **Improvised:** Result stores `keywords: Dict[str, Optional[KeywordResult]]` keyed by direction; pipeline runs Stage 1+2 for each direction in `["c2s","s2c"]`.

---

## 3. Improvised I/O / Tooling Components (not in paper)

### 3.1 PCAP / Hex / CSV Parsers

- **Paper:** Assumes PCAP traffic conceptually.
- **Improvised:** `io/loader.py` implements:
  - Pure-Python PCAP/PCAPNG parser (zero external deps); PCAPNG Enhanced Packet Block (type 6) + Simple Packet Block (type 2); endianness detection; VLAN (0x8100/0x88A8); Linux SLL (113); raw IP (12/101); scapy fallback.
  - `load_hex_lines()` — plain hex lines with optional trailing labels / `mN` ids / CSV-TSV format (`ts, src, dst, sport, dport, hex_data[, label]`).
  - `load_csv()` — CNN-pre format columns: `direction`, `type`, `hex`, `Full`.

### 3.2 Session / Direction / Pairing

- **Improvised:** `io/sessions.py`: flow grouping by (sorted IP, sorted port) 4-tuple; idle-gap session split (`session_gap_s=300`); direction modes `"port"` / `"first_packet"` / `"none"`; 1:1 request-response pairing.

### 3.3 Benchmarking & Ground Truth Cleaning

- **Paper:** Evaluated 8 protocols; overhead assessment (75.64s / 63.68MB vs baselines).
- **Improvised:** `eval/ground_truth.py`:
  - Modbus TCP length-field truncation (`signed=False`).
  - SMB / SMB2 magic filtering (`\xffSMB` / `\xfeSMB`).
  - Ground-truth keyword registry extended to 10 protocols: dnp3, modbus, ntp, ntp48, dhcp, tftp, smb, smb2, bgp, mavlink (paper: 8).

### 3.4 Catalog & Scaling Benchmark

- **Improvised:** `catalog.py` (SOURCES registry with `exists`, `file_size_kb`); `api_runner.py` `scaling_benchmark` command using proxy time `0.0012*s² + 0.05*s` (NetPlier proxy).

---

## 4. Improvised Evaluation / Diagnostic Layer (not in paper)

- **Health checks** (`trace.py`): boundary, pairs, direction balance, candidate pool size, true-keyword membership/rank, posterior ties, bit-score zero, Stage-2 override, degeneracy, missing labels, config non-default.
- **Consistency check** (`trace.py`): recomputes Stage-1 and Stage-2 values to compare against pipeline output (mismatches flagged).
- **Rule matrix / blocking** (`trace.py`): per-offset firing + per-message satisfaction + drop blocking logic.
- **Pipeline overview / message trace** (UI-facing) with capture caching.

---

## 5. Improvised Hardcoded Heuristics & Constants

| Heuristic | Default | Source |
|---|---|---|
| Checksum data range | prefix `data[:offset]` | D-20 |
| Float detector | min 5 distinct values; `enable_float`; `float_min_distinct=5` | improvised |
| Length detector | `enable_length`; `max_message_len=500` for modal-c; excluded from FOR candidates | D-08 |
| Timestamp slack | ±24h (`86400.0s`) | paper |
| Sparse ratio | ≤2% of value space; zero excluded; per-length unique caps | D-B1 |
| Address correlation | ≤ −0.8 | paper/code |
| Sequence exact ratio | `seq_match_ratio=1.0` | improvised |
| Stage-1 pair ratio | ≥30% paired for coupling | paper/code |
| Candidate cap | 64 | improvised |
| Session gap | 300s | improvised |

---

## 6. Improvised UI / Integration Layer (not in paper)

- Vite API middleware (`POST /api/run` → `python -m rpkclust.api_runner`); 8-tab frontend in single-file `App.tsx`; hyperparameter tuning panel; dataset provenance; pipeline tracker tab; stderr console; AI Studio env vars.

---

## 7. Summary of Improvised Parts

**In the algorithm/core math (V2-DECISIONS D-01…D-22):** per-direction handling, explicit TLV params/grid, exclusive boundary, T-V keywords, bit-use fixes, normalization toggles, clamps, label modes.

**Added beyond the paper (implementation features):** tagging stage, diagnostics, capture/error handling, PCAP/hex/CSV parsers, sessions/pairs, protocol cleaning, catalog, scaling benchmark, health checks, consistency check, UI, CLI/API.

If you want, I can update `RPKClust_Paper_Steps_Components.md` to merge these improvised parts into the final extraction document.
