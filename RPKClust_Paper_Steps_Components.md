# RPKClust — Paper Steps, Implementation Requirements & Components

> **Source paper:** `D:\Dan\00000 Arshad\MT\RPKClust\RPKClust.pdf` (Manuscript ID COMPJ-2025-06-0786, submitted 03-Jul-2025) and extended version `RPKClust-e.pdf`.  
> **Also extracted from:** `docs/V2-PIPELINE.md`, `docs/V2-DECISIONS.md`, `ASSUMPTIONS.md`, `BENCHMARKS.md`, `README.md`, `AGENTS.md`, and full source tree (`rpkclust/`).  
> **Author list (paper):** Qichao Yang, Xiaokang Yin, Fangfang Zhao, Shengli Liu — Information Engineering University, Zhengzhou, China.

---

## 1. Paper Identity & Abstract (extracted from PDF)

- **Title:** Region-Partitioned Keywords Inference for Binary Protocol Reverse Engineering  
- **Method:** RPKClust — region-based keyword positioning (no global MSA)  
- **Key concept:** Messages have a **Fixed-Offset Region (FOR)** followed by a **Non-Fixed-Offset Region (NFOR)**. Keyword fields sit at predictable positions relative to the FOR-NFOR boundary `B`.
- **Contributions:**
  1. FOR-NFOR boundary identification using explicit semantic detectors (not alignment).
  2. Region-partitioned keyword candidate generation (sliding windows in FOR, TLV detection in NFOR).
  3. Two-stage probabilistic constraint inference (Stage 1 = clustering constraints via star factor graph; Stage 2 = self-constraints + final posterior).
  4. Evaluated on 8 protocols (Modbus, DNP3, DHCP, TFTP, NTP, SMB, SMB2) — results: h=0.959, c=0.941, v=0.949; overhead ~75.64 s / 63.68 MB vs optimal baseline 915.37 s / 527.54 MB.
- **Pattern observation:** FOR-then-NFOR is related to protocol encapsulation. Keywords in FOR determine inner-layer structure; keywords in outermost layer determine whole message structure.

---

## 2. Pipeline Overview (5 Stages — Fig. 6 / Code)

From the code (`rpkclust/pipeline.py`) and documentation (`docs/V2-PIPELINE.md`):

```
PCAP / Hex Trace → io/loader → io/sessions → boundary.py → candidates/ → constraints/stage1 + stage2 → cluster.py → metrics.py → Result
```

| Stage | Function / Module | What It Does | Key Output |
|---|---|---|---|
| **1** | `boundary.find_boundary()` | Byte-by-byte scan using 6 semantic detectors; compute maximal `B = max(hit.offset + hit.length)` (exclusive first NFOR byte) | `BoundaryResult(B, hits, min_len)` |
| **2a** | `all_hits()` + tagging | Collect ALL semantic tags at offsets `[0..B)` for filtering | `tag_hits` list |
| **2b** | `candidates.generate_candidates()` | FOR sliding windows (`L ∈ {1,2,4}`) + NFOR TLV scan (type/length/value) | `List[Candidate]` (max 64) |
| **3** | `constraints.stage1.evaluate_stage1()` | 4 clustering constraints (similarity, remote coupling, structure, dimension) → star factor graph posterior `p_f` | `Stage1Result` (ranking, top_k=5) |
| **4** | `constraints.stage2.evaluate_stage2()` | Self-constraints: bit-use (`p_bit`) + position (`p_offset`) → combine with `p_f` via `combine_two_stage()` | `KeywordResult` (highest posterior) |
| **5** | `cluster.cluster_messages()` | Assign cluster labels per direction using best keyword | `Dict[int, str]` |
| **6** | `metrics.evaluate_clusters_against_messages()` | Homogeneity / Completeness / V-measure (pure Python or sklearn) | `(h, c, v)` |

---

## 3. Detailed Algorithms from Paper + Code

### 3.1 Algorithm 1 — FOR-NFOR Boundary Identification (Section 3.4 / `boundary.py`)

**Input:** Messages `M`, config `C`, pairs `P`, direction `d` (default `"both"`).

**Steps:**
1. Direction filter: if `d` in `{"c2s","s2c"}` filter messages; else all.
2. `min_len = min(len(m.data) for m in target_msgs)` — scan range `[0, min_len)`.
3. Get detectors in priority order (`BOUNDARY_RULES` = 6 rules; `EXTRA_RULES` = Float + Length, excluded by default via `config.boundary_include_extra_rules`).
4. For each `offset ∈ [0, min_len-1]`:
   - For each detector `r` (in priority order):
     - For each length `lr ∈ r.lengths`: if `offset + lr ≤ min_len`:
       - Build slices `m.data[offset:offset+lr]` for all target messages.
       - Call `r.check(slices, Context(...))` → returns `Hit` or `None`.
   - **First-match precedence:** if any hit, record it and break both loops (rule and length).
5. A hit at `o` with length `l` marks byte `[o, o+l-1]` as the **right boundary** of a semantic field.
6. Compute `B = max(hit.offset + hit.length)` (exclusive first NFOR byte). If no hits, `B = 0`.
7. Warning if `B == min_len` (entire message is FOR).

**Rules / Detectors (priority order — `detectors/registry.py`):**

| # | Detector | Lengths | Match Logic |
|---|---|---|---|
| 1 | `ConstantDetector` | `(8,4,2,1)` | All values identical at offset (R-06: multi-length) |
| 2 | `SequenceDetector` | `(1,2,3,4)` | Values form arithmetic progression (constant step) |
| 3 | `TimestampDetector` | `(4,8)` | Decoded within ±24h (`timestamp_slack_s=86400`) of capture range |
| 4 | `SparseDetector` | `(1,2)` | Low cardinality: ≤2% of value space (`sparse_ratio=0.02`), **non-zero only** (D-B1) |
| 5 | `AddressDetector` | `(2,3,4)` | Paired request/response fields swap values (negative correlation `≤ -0.8`) |
| 6 | `ChecksumDetector` | `(1,2,4)` | Checksum algorithms (sum8/xor8/crc8/crc16-ccitt/crc16-modbus/crc16-dnp/crc32) over prefix or trailer ranges |

**Excluded from boundary by default:** Float (`FloatDetector`) and Length (`LengthDetector`) — only used for FOR-candidate exclusion (`for_exclude_rules`).

---

### 3.2 Algorithm 2 — FOR Candidate Generation (`candidates/for_region.py`)

**Input:** Messages, `BoundaryResult` (`B`, hits), config `C`.

**Steps:**
1. **Semantic byte tagging:** For each hit in `[0, B)`:
   - If rule == `"sparse"` → add to `sparse_bytes` (rescued, **not excluded**).
   - If rule in `config.for_exclude_rules` (`constant`, `sequence`, `timestamp`, `float`, `length`, `checksum`, `address`) → add to `excluded_bytes`.
2. **Effective excluded:** `excluded_bytes - sparse_bytes`.
3. **Available set `S`:** `{0..B-1} - effective_excluded` ∪ `sparse_bytes`.
4. **Candidate generation:** For each `L ∈ config.fo_lengths_for_candidates` (`1,2,4`). For each starting `s` in sorted `S`:
   - **Modulo alignment:** `s % L == 0`.
   - **Continuity:** `is_continuous(S, s, L)` — all bytes `[s, s+L-1]` ∈ `S`.
   - **Cardinality pre-filter (opt-in, R-07):** If `config.candidate_max_distinct_ratio` set, require `distinct_count / num_msgs ≤ ratio`. Disabled by default (`None`).

---

### 3.3 Algorithm 3 — NFOR TLV Candidate Generation (`candidates/nfor_tlv.py`)

**Input:** Messages, `B`.

**Steps:**
1. Extract NFOR slices: `m.data[B:]` where `len > B`.
2. Scan byte-by-byte for TLV patterns.
3. **Validation (`ValidateTLV`):** `offset + t_len + l_len + len_val ≤ len(m)`, `len_val ≥ 0`, and either reaches end or followed by another valid TLV (chain consistency).
4. For each valid TLV: create `Candidate(region="NFOR", offset=first_offset, length=v_len, kind="tlv", tlv_type=t_tag, endian, t_len, l_len)`.

**TLV defaults (R-08, D-04):** `t_len=1`, `l_len=1`, `endian="big"`. Grid search `(1,2) × (1,2) × (big,little)` enabled via `config.tlv_auto_params=True`. Filters: `tlv_min_repeats=2`, `tlv_min_coverage=0.6`, `tlv_min_presence=0.8`, `tlv_max_type_cardinality=255`.

**Candidate extraction (`Candidate.extract()` in `model.py`):**
- FOR: `m.data[offset:offset+length]`
- NFOR with `tlv_type`: scan byte-by-byte for tag, read length using stored `t_len`/`l_len` (no guessing), return combined **T-V** (`type_bytes + value_bytes`) — per R-01 / D-12.
- NFOR without `tlv_type`: fallback to offset-based.

---

### 3.4 Stage 1 — Four Clustering Constraints (`constraints/stage1.py`)

For each candidate, cluster messages by extracted value. Evaluate:

| Constraint | Source / Formula | Description / Notes |
|---|---|---|
| **Similarity** (`p_m`) | `compute_pairwise_similarity()` + `compute_eer()` | Alignment-free: FOR positional exact match + NFOR `difflib.SequenceMatcher` (first 64 bytes). `raw_p_m = 1 - EER` where EER = min over 101 thresholds of `|(FMR-FNMR)|`. Degenerate → 0.90. |
| **Remote Coupling** (`p_r`) | `pair_map` from `Pair` list | Cross-protocol correlation: do partner messages across request-response pairs cluster by keyword value? Requires ≥30% paired messages (`pair_min_ratio=0.3`). If insufficient → 0.50 (neutral). |
| **Structural Consistency** (`p_s`) | Message length variance | `1 - mean(|l - median|) / max(l)`. Singletons penalized (0.10). |
| **Dimension** (`p_d`) | Distinct value count / cluster counts | If `r_distinct ≤ 0.5` AND `r_single < 0.5` → `p_d = 0.95`; else hard penalty `0.01` (and suppress other scores). |

**Star factor graph (`constraints/posterior.py`):** 4 observations (`sim`, `coupling`, `struct`, `dim`) linked to latent `K ∈ {0,1}` via three factor types (`f_obs`, `f_fwd`, `f_bwd`).

Fixed constants (R-11 / D-09 from NetPlier reference):
- `p_arrow = {sim:0.8, coupling:0.9, struct:0.9, dim:0.9}`
- `p_back = {sim:0.8, coupling:0.8, struct:0.8, dim:0.7}`

Log-odds accumulation: `log_odds += ln(g_1 / g_0)` across 4 observations → `p_f = sigmoid(log_odds)`. Clamped to `[1e-12, 1-1e-12]` by default; hard clamp via `prob_clip` config.

**Normalization (R-10, D-16):** Off by default (`stage1_normalize=False`). When on: min-max normalize `p_m`, `p_r`, `p_s` into `[0.1, 0.95]`.

---

### 3.5 Stage 2 — Self-Constraints (`constraints/stage2.py`)

For top-K from Stage 1 (`stage1_top_k=5`, R-19):

| Constraint | Formula / Method | Notes |
|---|---|---|
| **Bit-use** (`p_bit`) | Empirical MSB distribution `Q(k)` vs theoretical `P(k)=1-1/2^(MSB+1-k)`. `D = Euclidean distance`. `p_bit = 1 - D/D_max`. | Zero values excluded (D-B1). `dmax_mode="max_over_m"` (max over all bit positions) or `"m_equals_msb"`. Endian via `bituse_endian`. |
| **Position** (`p_offset`) | FOR: `max(0.95 - 0.01*offset, 0.70)` (base=0.95, slope=-0.01, floor=0.70). NFOR: `0.60` (fixed). | Config `pos_for=(0.95, 0.01, 0.70)`, `pos_nfor=0.60`. |

**Two-stage combination:**
- `M = p_bit * p_offset * p_f`
- `N = (1-p_bit)*(1-p_offset)*(1-p_f)`
- `P(K=1) = M / (M + N)`

Winner = max posterior; tie-break by smaller offset, then shorter length.

---

### 3.6 Clustering (`cluster.py`)

- Select best overall keyword (highest `posterior` across directions).
- Per message: use direction key (`c2s`/`s2c`), try best overall candidate first, fall back to per-direction keyword.
- Label format: `f"{direction}_{val.hex()}"` or `f"{direction}_none"`.

---

### 3.7 Metrics (`metrics.py`)

- Homogeneity `h = 1 - H(C|K)/H(C)`
- Completeness `c = 1 - H(K|C)/H(K)`
- V-measure `v = 2*h*c/(h+c)`
- Clamped to `[0.0, 1.0]`. Pure Python fallback if sklearn unavailable.

---

## 4. Data Models (Frozen Dataclasses — `model.py`)

| Model | Frozen? | Key Fields |
|---|---|---|
| `Message` | ✅ | `id`, `data` (bytes), `ts`, `src/dst`, `sport/dport`, `direction` (`c2s/s2c/unk`), `session_id`, `label` (ground truth) |
| `Pair` | ✅ | `req_id`, `resp_id`, `session_id`, `dt` |
| `Trace` | ✅ | `messages`, `pairs`, `capture_range` |
| `Hit` | ✅ | `rule`, `offset`, `length`, `info` |
| `Candidate` | ✅ | `region` (FOR/NFOR), `offset`, `length`, `kind` (window/tlv), `direction`, `tlv_type`, `endian`, `t_len`, `l_len` |
| `BoundaryResult` | ❌ (mutable) | `B`, `hits`, `min_len`, `direction` |
| `ScoredCandidate` | ❌ | `candidate`, `p_m`, `p_r`, `p_s`, `p_d`, `p_f`, `rank`, `clusters` |
| `Stage1Result` | ❌ | `ranking`, `top_k` |
| `KeywordResult` | ❌ | `direction`, `candidate`, `posterior`, `p_bit`, `p_offset`, `p_f`, `ranking` |
| `Result` | ❌ | `boundary`, `candidates`, `keywords`, `clusters`, `diagnostics`, `trace` |

**Convention:** All message-level structures frozen; pipeline results mutable for incremental construction.

---

## 5. Configuration (`config.py` — ~30+ params)

Key params by category:

**Boundary:** `boundary_per_direction` (F), `boundary_require_contiguous` (F), `boundary_min_msgs` (20), `boundary_include_extra_rules` (F), `for_exclude_rules` (7 rules).

**Candidates:** `fo_lengths_for_candidates` `(1,2,4)`, `max_candidates` (64), `tlv_auto_params` (F), `tlv_t_len/len` (1,1), `tlv_endian` ("big"), `tlv_t_lens/l_lens/endians` grid, `tlv_min_repeats` (2), `tlv_min_coverage` (0.6), `tlv_min_presence` (0.8), `candidate_max_distinct_ratio` (None = off, R-07).

**Stage 1:** `stage1_top_k` (5, R-19), `sim_sample_size` (200), `sim_sample_pairs` (20000), `pair_min_ratio` (0.3), `struct_mode` ("length"), `predicate_mode` ("per_cluster"), `stage1_normalize` (F, R-10), `norm_range` `(0.1,0.95)`, `prob_clip` (None, R-12).

**Stage 2:** `pos_for` `(0.95,0.01,0.70)`, `pos_nfor` `0.60`, `bituse_endian` ("big"), `dmax_mode` ("max_over_m", R-14), `cluster_label_mode` ("per_direction", R-18, D-21).

**I/O:** `seed` (0), `session_gap_s` (300), `direction_mode` ("port"), `max_candidates` (64).

---

## 6. Detectors (Protocol Pattern — `detectors/`)

Each implements `Detector` protocol (`base.py`): `name`, `lengths`, `check(slices, ctx) → Optional[Hit]`. Registry (`registry.py`) defines `BOUNDARY_RULES` (ordered) + `EXTRA_RULES`.

**Semantics:**
- `constant`: all identical.
- `sequence`: arithmetic progression.
- `timestamp`: within ±24h.
- `sparse`: ≤2% distinct (non-zero only).
- `address`: paired swap (negative correlation ≤ -0.8).
- `checksum`: algorithm match over prefix or trailer.
- `float`: min 5 distinct float-like values (`enable_float`).
- `length`: length-field pattern (`enable_length`).

---

## 7. Implementation Requirements (from `AGENTS.md` / code)

- **Python:** `from __future__ import annotations`; type hints all functions; frozen dataclasses; `Optional[X]` over `X | None`; docstrings; pytest (no mocking — synthetic `Message` objects).
- **Frontend:** React 19 + TypeScript + Vite 8 + Tailwind CSS 4; single-file `App.tsx`; `useState`/`useEffect`; `fetch('/api/run')`; interfaces mirror Python field names; lucide-react icons; motion animations.
- **API:** `api_runner.py` reads JSON stdin / writes stdout; `vite.config.ts` `apiPlugin()` intercepts `POST /api/run`; Windows uses `py`/`python`; Unix `python3`; stderr returned on non-zero exit.
- **Build:** `npm run build` → `dist/`; `npm run typecheck` (`tsc --noEmit`).
- **Tests:** 22 tests across 7 files (`test_fig1_pipeline.py`, `test_boundary`, `test_detectors`, `test_candidates`, `test_stage1_constraints`, `test_stage2_constraints`, `test_model_config`).

---

## 8. Datasets & Evaluation (`BENCHMARKS.md` / `catalog.py`)

| Source | Protocols (7) | Datasets | True Keyword Offset (example) |
|---|---|---|---|
| **NetPlier** | modbus, dnp3, dhcp, tftp, ntp, smb, smb2 | `*_100.pcap` | Modbus: offset 7, 1B; DNP3: 12, 1B; DHCP: 242, 1B; TFTP: 0, 2B; NTP: 0 bits 5-7; SMB: 8, 1B; SMB2: 16, 2B |
| **ICS Real** | same | `*.pcap` (larger, e.g., modbus 4901 msgs) | Same offsets (approx) |

**Average V-Measure:** NetPlier = 71.2%; ICS Real = 74.5%.

---

## 9. Key Design Decisions (from paper + `V2-DECISIONS.md`)

- **D-01:** Boundary per direction; shared scan option (`boundary_per_direction`).
- **D-02:** `L ∈ {1,2,4}` (standard binary fields).
- **D-03:** No dynamic boundary expansion in v1; hook `expand_boundary()` returns unchanged.
- **D-04:** TLV `t_len/l_len ∈ {1,2}`, both endians.
- **D-05:** Sub-byte keywords unsupported (bit-level handled by bit-use detector but not primary keyword).
- **D-06:** Stage-1 posterior closed-form star graph (no approximation needed).
- **D-07:** Alignment-free surrogates (core thesis).
- **D-08:** Length detector added; excluded from FOR candidates.
- **D-09:** `p_arrow/p_back` hardcoded from NetPlier; `config.p_imp` removed.
- **D-10:** `B` exclusive (first NFOR byte): `B = max(offset + length)`.
- **D-11:** Float/Length excluded from boundary by default (`boundary_include_extra_rules`).
- **D-12:** NFOR candidate = combined T-V (`type + value`), not just V.
- **D-13:** `t_len/l_len` stored explicitly; no guessing heuristic.
- **D-14:** Cardinality pre-filter disabled by default.
- **D-15:** TLV grid search behind `tlv_auto_params`; default fixed `(1,1,big)`.
- **D-16:** Stage-1 normalization behind `stage1_normalize`; default `False`.
- **D-17:** Probability clamping by `prob_clip`; default only numeric guard (`1e-12`).
- **D-18:** `dmax_mode = "max_over_m"` (default) or `"m_equals_msb"`.
- **D-19:** Bit-use endianness `config.bituse_endian`.
- **D-20:** Checksum range = prefix before field (`data[:offset]`).
- **D-21:** Cluster labels per-direction (`cluster_label_mode = "per_direction"`).
- **D-22:** `stage1_top_k` = 5 (default within documented {3,4,5}).

---

## 10. Mathematical Equations (from paper + code)

- **Star posterior:** `log_odds = Σ ln(g_1/g_0)`; `p_f = 1/(1+exp(-log_odds))`
- **EER:** `min_t |FMR(t) - FNMR(t)|`; `raw_p_m = 1 - EER`
- **Structure:** `c_ps = 1 - mean(|l - median|)/max(l)`
- **Dimension:** `p_d = 0.95` if `r_distinct ≤ 0.5` and `r_single < 0.5`; else `0.01`
- **Bit-use:** `Q(k) = proportion(values with MSB ≥ k)`; `P(k) = 1 - 1/2^(MSB+1-k)`; `p_bit = 1 - D/D_max`
- **Position:** `p_offset = max(0.95 - 0.01*offset, 0.70)` (FOR); `0.60` (NFOR)
- **Final:** `M = p_bit*p_offset*p_f`; `N = (1-p_bit)(1-p_offset)(1-p_f)`; `P(K=1) = M/(M+N)`

---

## 11. File References (Implementation Locations)

| Component | File(s) |
|---|---|
| Pipeline orchestration | `rpkclust/pipeline.py` |
| Boundary detection | `rpkclust/boundary.py` |
| Semantic detectors | `rpkclust/detectors/*.py`, `base.py`, `registry.py` |
| Candidate generation | `rpkclust/candidates/__init__.py`, `for_region.py`, `nfor_tlv.py` |
| Stage 1 constraints | `rpkclust/constraints/stage1.py`, `posterior.py` |
| Stage 2 self-constraints | `rpkclust/constraints/stage2.py` |
| Clustering | `rpkclust/cluster.py` |
| Metrics | `rpkclust/metrics.py` |
| Data models | `rpkclust/model.py` |
| Config | `rpkclust/config.py` |
| I/O / loading | `rpkclust/io/loader.py`, `io/sessions.py` |
| Catalog / ground truth | `rpkclust/catalog.py`, `eval/ground_truth.py` |
| CLI / API | `rpkclust/cli.py`, `api_runner.py` |
| Frontend app | `src/App.tsx` (tab-based navigation) |
| Vite middleware | `vite.config.ts` |
| Tests | `tests/` (22 tests, 7 files) |

---

*Extracted on 2026-10-22. Paper text extracted via custom Python zlib-based parser from `RPKClust.pdf`. All step descriptions cross-referenced with `docs/V2-PIPELINE.md`, source files, and `V2-DECISIONS.md`.*
