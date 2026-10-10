# RPKClust Pipeline Documentation

## Overview

RPKClust (Region-Partitioned Keywords Inference for Binary Protocol Reverse Engineering) is a research tool for automatically identifying keyword fields in binary network protocols from PCAP captures. The pipeline ingests raw packet captures, detects the boundary between fixed-offset and variable-offset regions, generates candidate keyword fields, evaluates them through a two-stage probabilistic constraint system, clusters messages by keyword value, and reports evaluation metrics.

### System Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────────┐
│   PCAP File  │────▶│  io/loader.py   │────▶│  io/sessions.py     │
│  Hex Lines   │     │ (pure-Python    │     │ (session/direction   │
│              │     │  PCAP parser)    │     │  assignment + pairing) │
└──────────────┘     └─────────────────┘     └─────────┬────────────┘
                                                          │ Trace
                                                          ▼
┌────────────────────┐   ┌───────────────┐   ┌────────────┴──────────┐
│  config.py         │   │  model.py     │   │  pipeline.py          │
│  (all hyper-      │   │  (frozen      │   │  orchestrator)        │
│   parameters)     │   │   dataclasses)│   │                       │
└────────┬───────────┘   └───────┬───────┘   └─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬───┘
         │                       │             │ │ │ │ │ │ │ │ │
         │                       │  Stage 1: Boundary Detection
         │                       │  boundary.py  ───▶ BoundaryResult(B, hits)
         │                       │                   │
         │                       │  Stage 2: Candidate Generation
         │                       │  candidates/   ───▶ List[Candidate]
         │                       │                   │
         │                       │  Stage 3: Stage 1 Constraints
         │                       │  constraints/stage1.py ───▶ Stage1Result(p_f, ranking)
         │                       │                   │
         │                       │  Stage 4: Stage 2 Constraints
         │                       │  constraints/stage2.py ───▶ KeywordResult(posterior)
         │                       │                   │
         │                       │  Stage 5: Clustering
         │                       │  cluster.py ───▶ Dict[int, str]
         │                       │                   │
         │                       │  Stage 6: Metrics
         │                       │  metrics.py   ───▶ (h, c, v_measure)
         │             ┌─────────┴───────────────┐
         │             │         Result          │
         │             │  (boundary, candidates, │
         │             │   keywords, clusters,   │
         │             │   diagnostics)          │
         │             └─────────┬───────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐  ┌─────────────────────────┐
│  api_runner.py  │  │  cli.py (CLI)           │
│  (JSON stdin/   │  │  run, eval, bench       │
│   stdout API)   │  │  commands               │
└────────┬────────┘  └─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  vite.config.ts         │
│  (Vite middleware:       │
│   POST /api/run →        │
│   spawns python3 -m      │
│   rpkclust.api_runner)   │
         │
         ▼
┌─────────────────────────┐
│  src/App.tsx            │
│  (React frontend)       │
└─────────────────────────┘
```

---

## Data Models

All core data models are defined in `rpkclust/model.py`. Message-level structures (`Message`, `Pair`, `Hit`, `Candidate`) are **frozen dataclasses** — they are immutable. Pipeline result structures (`BoundaryResult`, `ScoredCandidate`, `Stage1Result`, `KeywordResult`, `Result`) are **mutable** — constructed incrementally during processing.

### `Message` (frozen)
| Field | Type | Default | Description |
|---|---|---|---|
| `id` | `int` | — | Sequential message index |
| `data` | `bytes` | — | Application-layer payload |
| `ts` | `float` | `0.0` | Epoch seconds (from PCAP timestamp) |
| `src` | `str` | `"127.0.0.1"` | Source IP |
| `dst` | `str` | `"127.0.0.1"` | Destination IP |
| `sport` | `int` | `0` | Source port |
| `dport` | `int` | `0` | Destination port |
| `direction` | `str` | `"c2s"` | `"c2s"`, `"s2c"`, or `"unk"` |
| `session_id` | `int` | `0` | Session identifier |
| `label` | `Optional[str]` | `None` | Ground-truth keyword (evaluation only) |

### `Pair` (frozen)
| Field | Type | Default | Description |
|---|---|---|---|
| `req_id` | `int` | — | Request `Message.id` |
| `resp_id` | `int` | — | Response `Message.id` |
| `session_id` | `int` | — | Shared session identifier |
| `dt` | `float` | `0.0` | Response-to-request time delta (seconds) |

### `Trace` (frozen)
| Field | Type | Default | Description |
|---|---|---|---|
| `messages` | `List[Message]` | — | Parsed messages |
| `pairs` | `List[Pair]` | `[]` | Request-response pairings |
| `capture_range` | `Tuple[float, float]` | `(0.0, 0.0)` | `(t_start, t_end)` of capture |

### `Hit` (frozen)
| Field | Type | Default | Description |
|---|---|---|---|
| `rule` | `str` | — | Detector name (e.g., `"constant"`, `"sparse"`) |
| `offset` | `int` | — | Byte offset where the field starts |
| `length` | `int` | — | Field length in bytes |
| `info` | `Dict[str, Any]` | `{}` | Detector-specific metadata |

### `Candidate` (frozen)
| Field | Type | Default | Description |
|---|---|---|---|
| `region` | `str` | — | `"FOR"` or `"NFOR"` |
| `offset` | `int` | — | FOR: fixed byte offset; NFOR: first observed offset |
| `length` | `int` | — | Window length (FOR) or V length (NFOR) |
| `kind` | `str` | `"window"` | `"window"` or `"tlv"` |
| `direction` | `str` | `"both"` | `"both"`, `"c2s"`, or `"s2c"` |
| `tlv_type` | `Optional[bytes]` | `None` | NFOR TLV type tag |
| `endian` | `str` | `"big"` | Byte order for TLV length field |
| `t_len` | `int` | `1` | TLV Type field length (NFOR only, R-02) |
| `l_len` | `int` | `1` | TLV Length field length (NFOR only, R-02) |
| `t_len` | `int` | `1` | TLV Type field length (NFOR only, R-02) |
| `l_len` | `int` | `1` | TLV Length field length (NFOR only, R-02) |

**`Candidate.extract(m: Message) -> Optional[bytes]`**: Extracts field bytes from a message.

- **FOR region**: Returns `m.data[offset : offset + length]` (direct offset slice).
- **NFOR region with `tlv_type`** (R-01): Scans payload byte-by-byte for matching TLV type tag, reads length field using **stored** `t_len`/`l_len` (no guessing), returns combined **T-V** bytes (`type_bytes + value_bytes`).
- **NFOR without `tlv_type`**: Falls back to offset-based extraction.
- Returns `None` if extraction fails (e.g., message too short or no matching TLV).

### Pipeline Result Types (mutable)
| Class | Fields |
|---|---|
| `BoundaryResult` | `B: int`, `hits: List[Hit]`, `min_len: int`, `direction: str` |
| `ScoredCandidate` | `candidate: Candidate`, `p_m: float`, `p_r: float`, `p_s: float`, `p_d: float`, `p_f: float`, `rank: int`, `clusters: Dict` |
| `Stage1Result` | `ranking: List[ScoredCandidate]`, `top_k: List[Candidate]`, `details: Dict` |
| `KeywordResult` | `direction: str`, `candidate: Candidate`, `posterior: float`, `p_bit`, `p_offset`, `p_f`, `ranking: List[Dict]` |
| `Result` | `boundary`, `candidates`, `keywords: Dict[str, Optional[KeywordResult]]`, `clusters: Dict[int, str]`, `diagnostics` |

---

## Stage 1: Data Loading

### `rpkclust/io/loader.py`

**Entry points**: `load_pcap(pcap_path, config)` and `load_hex_lines(file_or_content, config)`.

#### PCAP Parsing (`parse_pcap_packets`)
- Pure-Python PCAP/PCAPNG parser with **zero external dependencies**.
- **PCAPNG** (magic `\x0a\x0d\x0d\x0a`): Parses Enhanced Packet Blocks (type 6) and Simple Packet Blocks (type 3). Handles little/big-endian. Falls back to scapy's `PcapNgReader` if pure-Python parsing fails.
- **Classic libpcap**: Detects endianness via magic bytes (`\xa1\xb2\xc3\xd4` = big-endian, `\xd4\xc3\xb2\xa1` = little-endian). Reads 16-byte per-packet headers (timestamp, captured length, original length).
- For each packet, `_parse_raw_eth_ip()` strips Ethernet → IPv4 → TCP/UDP headers and extracts `(src_ip, dst_ip, sport, dport, payload)`.
- `_parse_raw_eth_ip` handles 802.1Q VLAN tags (0x8100, 0x88A8) and Linux cooked SLL (link_type 113).

#### Hex Lines Parsing (`load_hex_lines`)
- Accepts either a file path or raw string content.
- Strips comments (lines starting with `#`) and whitespace.
- Supports two formats:
  1. **Plain hex**: `05 64 ... Read` — bytes separated by spaces, optional trailing label.
  2. **Tab/CSV**: `ts, src, dst, sport, dport, hex_data[, label]` — 6+ fields.
- For plain hex, assigns synthetic endpoints (10.0.0.1:10000 ↔ 10.0.0.2:502).
- Pads odd-length hex by truncating the last character.
- Calls `assign_sessions_and_directions()` and `pair_messages()` from `sessions.py`.

### `rpkclust/io/sessions.py`

**`assign_sessions_and_directions(messages, config) -> List[Message]`**
- Sorts messages chronologically by `(ts, id)`.
- Groups messages by 4-tuple `(sorted IPs, sorted ports)` into flows.
- Splits each flow into sessions by idle timeout (`config.session_gap_s`, default 300s).
- Direction assignment (`config.direction_mode`, default `"port"`):
  - The lower port is the server port. Messages from the server port → `"s2c"` (response); otherwise → `"c2s"` (request).
  - If `direction_mode == "none"`: assigns alternating directions (even index = c2s, odd = s2c).
- Returns new `List[Message]` sorted by original `id`.

**`pair_messages(messages) -> List[Pair]`**
- Groups messages by `session_id`.
- For each session, iterates chronologically. A `"c2s"` message sets `pending_req`; the next `"s2c"` message pairs with it via `Pair(req_id, resp_id, session_id, dt = resp.ts - req.ts)`.
- Strict 1:1 pairing: the next request resets `pending_req`.
- Returns `List[Pair]`.

**Output**: `Trace(messages, pairs, capture_range=(t_start, t_end))`.

---

## Stage 2: Boundary Detection

### `rpkclust/boundary.py` — Algorithm 1

**Purpose**: Identifies the maximal boundary `B` between the Fixed-Offset Region (FOR) and Non-Fixed-Offset Region (NFOR). FOR bytes are at predictable offsets (e.g., headers); NFOR bytes are at variable offsets (e.g., TLV values).

**`find_boundary(messages, config, pairs, direction) -> BoundaryResult`**

1. **Direction filtering**: If `direction` is `"c2s"` or `"s2c"`, filter messages to that direction. Otherwise uses all messages.

2. **Compute `min_len`**: `min(len(m.data) for m in target_msgs)` — defines the scan range `[0, min_len)`.

3. **Get detectors**: `get_detectors(config)` returns 6 detectors in priority order (R-05: Float and Length are excluded from boundary by default; see Detectors section).

4. **Byte-by-byte scan** over `offset` from `0` to `min_len - 1`:
   - Create a `Context` (messages, offset, capture_range, pairs, config).
   - **First-match precedence**: For each detector (in priority order), for each length in `detector.lengths`, if `check()` returns a non-None `Hit`, record it and break out of both loops.
   - A hit at offset `o` with length `l` marks byte positions `[o, o+l-1]` as the right boundary of a semantic field.

4. **Compute `B`**: `B = max(hit_offsets) + 1` where `hit_offset = hit.offset + hit.length - 1` (R-03: the right boundary byte). Equivalent to `B = max(hit.offset + hit.length)` — the first NFOR byte. If no hits, `B = 0`.

5. **Warning**: If `B == min_len` and `min_len > 0`, logs that the entire message is classified as FOR.

### `rpkclust/detectors/` — Semantic Detectors

**`Detector` Protocol** (`detectors/base.py`): Each detector exposes `name: str`, `lengths: Tuple[int, ...]`, and `check(slices: List[bytes], ctx: Context) -> Optional[Hit]`.

**`Context`** (`detectors/base.py`): `messages`, `offset`, `capture_range`, `pairs`, `config`.

**`DEFAULT_RULES`** (`detectors/registry.py`): Ordered list determining first-match precedence:

| Order | Detector | `lengths` | Rule |
|---|---|---|---|
| 1 | `ConstantDetector` | `(8, 4, 2, 1)` | All values identical at offset (R-06: multi-length) |
| 2 | `SequenceDetector` | `(1, 2, 3, 4)` | Values form arithmetic progression (constant step) |
| 3 | `TimestampDetector` | `(4, 8)` | Decoded values fall within ±24h of capture range |
| 4 | `SparseDetector` | `(1, 2)` | Low-cardinality field (≤2% of value space, **non-zero only** per D-B1) |
| 5 | `AddressDetector` | `(2, 3, 4)` | Paired request/response fields swap values |
| 6 | `ChecksumDetector` | `(1, 2, 4)` | Checksum algorithm matches field value |

**R-05:** Float (`FloatDetector`) and Length (`LengthDetector`) detectors are **not** part of the boundary registry by default. They are used only in the "exclude from FOR candidates" step (Algorithm 2). Enable via `config.boundary_include_extra_rules = True`.

**Checksum algorithms** (1 byte: xor8, sum8, crc8 with poly 0x07; 2 bytes: crc16-modbus 0xA001, crc16-ccitt 0x1021, crc16-dnp 0xA6BC; 4 bytes: zlib crc32).

**`get_detectors(config)`**: Returns `BOUNDARY_RULES` (6 paper rules) by default. When `config.boundary_include_extra_rules = True`, also includes Float and Length detectors.

**`all_hits(messages, config, max_offset, pairs)`**: Alternative to `find_boundary()` that collects all hits (not just first-match). Not used by the pipeline itself.

---

## Stage 3: Candidate Generation

### `rpkclust/candidates/__init__.py` → `generate_candidates`

Calls `generate_for_candidates()` and `generate_nfor_candidates()`, merges and deduplicates, sorts by `(offset, length)`, caps at `config.max_candidates` (default 64).

### `rpkclust/candidates/for_region.py` — Algorithm 2 (FOR Candidates)

**Input**: messages, `boundary_b`, `semantic_hits`.

1. **Semantic byte tagging**: For each `Hit`, mark bytes in `[hit.offset, min(hit.offset + hit.length, B))`:
   - If rule == `"sparse"`: add to `sparse_bytes` (keyword-like, **not excluded**).
   - If rule in `config.for_exclude_rules`: add to `excluded_bytes` with reason.

2. **Effective excluded set**: `excluded_bytes - sparse_bytes` (sparse bytes are rescued from exclusion).

3. **Available set `S`**: `{0..B-1} - effective_excluded` (bytes not excluded by semantic rules) ∪ `sparse_bytes`.

4. **Candidate generation** (for each `L` in `config.fo_lengths_for_candidates` = `(1, 2, 4)`, for each starting position `s` in sorted `S`):
   - **Modulo alignment**: `s % L == 0`.
   - **Continuity**: `is_continuous(S, s, L)` — all bytes `[s, s+L-1]` must be in `S`.
    - **Cardinality pre-filter (R-07, opt-in)**: Only applies when `config.candidate_max_distinct_ratio` is set (default `None` = off). Checks `distinct_count / num_msgs > ratio`.

### `rpkclust/candidates/nfor_tlv.py` — Algorithm 3 (NFOR TLV Candidates)

1. **Extract NFOR slices**: `m.data[boundary_b:]` for each message where `len(m.data) > boundary_b`.

4. **Candidate generation**: For each valid TLV found, creates `Candidate(region="NFOR", offset=first_offset, length=v_len, kind="tlv", tlv_type=t_tag, endian, t_len, l_len)` with all four fields stored.

**R-08**: Defaults to fixed parameters `t_len=1, l_len=1, endian="big"` (matching the paper). Grid search over `(1,2) × (1,2) × (big,little)` is enabled via `config.tlv_auto_params = True`, with `tlv_min_coverage` (0.6) and `tlv_min_presence` (0.8) filters applying in that mode.

---

## Stage 4: Two-Stage Probabilistic Constraint Inference

### `rpkclust/constraints/posterior.py` — Bayesian Factor Graph

**Star factor graph**: 4 observations (sim, coupling, struct, dim) each linked to latent keyword variable `K ∈ {0, 1}` via three factor types:

| Factor | Meaning |
|---|---|
| Observation factor `f_obs(K, x)` | Likelihood of observing `x` given `K` |
| Forward factor `f_fwd(K → x)` | Reliability of K influencing x (p_arrow) |
| Backward factor `f_bwd(x → K)` | Reliability of x indicating K (p_back) |

**Fixed constants** (R-11: documented from NetPlier, paper gives no numbers):
```
p_arrow = {"sim": 0.8, "coupling": 0.9, "struct": 0.9, "dim": 0.9}
p_back  = {"sim": 0.8, "coupling": 0.8, "struct": 0.8, "dim": 0.7}
```

**`compute_star_posterior(p_obs, p_arrow, p_back, prob_clip=None) -> float`**
- For each observation: computes `g_1` (marginal likelihood K=1) and `g_0` (K=0).
- **Log-odds accumulation**: `log_odds += ln(g_1 / g_0)` across all 4 observations.
- **Sigmoid**: `p_f = 1 / (1 + exp(-log_odds))`.
- R-12: Clamped to `[1e-12, 1-1e-12]` by default (numeric guard only). Hard clamps via `prob_clip=(lo, hi)` config.

**`combine_two_stage(p_f, p_bit, p_offset, prob_clip=None) -> float`**
- `M = p_bit * p_offset * p_f` (support for K=1).
- `N = (1-p_bit) * (1-p_offset) * (1-p_f)` (support for K=0).
- `P(K=1) = M / (M + N)`.
- R-12: Inputs clamped to `[1e-12, 1-1e-12]` by default (numeric guard). Hard clamps via `prob_clip` config.

### `rpkclust/constraints/stage1.py` — Stage 1 (4 Constraints)

**`evaluate_stage1(messages, candidates, boundary_b, config, pairs, direction) -> Stage1Result`**

For each candidate (values extracted via `Candidate.extract()`), 4 constraints are evaluated:

| # | Constraint | Raw Score Source | Description |
|---|---|---|---|
| 1 | **Message Similarity** (p_m) | `compute_eer()` | Equal Error Rate between intra-cluster and inter-cluster pairwise similarity distributions. `raw_p_m = 1 - EER`. |
| 2 | **Remote Coupling** (p_r) | `pair_map` from `Pair` list | Cross-protocol correlation: do partner messages across request-response pairs cluster by keyword value? Requires ≥30% paired messages. |
| 3 | **Structural Consistency** (p_s) | Message length variance | `1 - mean(|l - median|) / max(l)`. |
| 4 | **Dimension** (p_d) | Distinct value count | `p_d = 0.95` if `distinct/total ≤ 0.5` AND `singletons < 50%`; else `0.01` (hard penalty). |

**`compute_pairwise_similarity(msg_a, msg_b, boundary_b) -> float`**: Alignment-free similarity combining FOR positional byte matches + NFOR `difflib.SequenceMatcher` matching (first 64 bytes of NFOR region).

**`compute_eer(inner_scores, inter_scores) -> float`**: Sweeps 101 thresholds (0.00–1.00), finds threshold minimizing `|FMR - FNMR|`, returns the average. Returns 0.90 for degenerate inputs.

**Normalization**: R-10: Off by default. When `config.stage1_normalize = True`, `raw_p_m`, `raw_p_r`, `raw_p_s` are min-max normalized into `[0.1, 0.95]` (or `0.50` if uniform).

**Output**: `Stage1Result.ranking` (list of `ScoredCandidate` sorted by `p_f` descending), `top_k` (top K candidates, default 5).

### `rpkclust/constraints/stage2.py` — Stage 2 (Self-Constraints)

**`evaluate_stage2(messages, stage1_result, config, direction) -> KeywordResult`**

For each top-K candidate from Stage 1:

   - **Bit-use constraint** (`compute_bit_use_prob`): Tests whether byte values exhibit natural entropy or are concentrated at a single bit position (indicating flags/enums).
     - Computes empirical MSB distribution `Q(k)` (fraction of values with MSB ≥ k).
     - Compares against theoretical uniform distribution `P(k) = 1 - 1/2^(max_msb+1-k)`.
     - `p_bit = 1 - D/D_max` where `D` is Euclidean distance between Q and P, `D_max` is worst-case distance (single-bit distribution).
     - R-12: Defaults to `[1e-12, 1-1e-12]` clamp (numeric guard). R-14: `dmax_mode = "max_over_m"` (default) or `"m_equals_msb"`.

   2. **Position constraint** (`compute_position_prob`): FOR bytes near the start of the packet get higher probability.
     - **FOR**: `p_offset = max(0.95 - 0.01 * offset, 0.70)` — base 0.95, slope -0.01 per byte, floor 0.70.
     - **NFOR**: Fixed `0.60`.
     - R-12: Defaults to `[1e-12, 1-1e-12]` clamp (numeric guard).

3. **Two-stage combination**: `posterior = combine_two_stage(p_f, p_bit, p_offset)`.

**Output**: `KeywordResult` with the highest-posterior candidate and a full ranking.

---

## Stage 5: Clustering

### `rpkclust/cluster.py`

**`cluster_messages(messages, keywords) -> Dict[int, str]`**

1. **Select best overall keyword**: The keyword with the highest `posterior` across all directions.

2. **Per-message assignment**: For each message:
   - Determine direction key (`"c2s"` or `"s2c"` from `m.direction`).
   - If the per-direction keyword exists but the best overall has higher posterior: try extracting with the best overall candidate first, fall back to the per-direction keyword.
   - If no per-direction keyword: use the best overall candidate.
   - Extract `val = chosen_candidate.extract(m)`.
   - Cluster label: `f"{direction}_{val.hex()}"` if extracted; else `f"{direction}_none"` or `f"{direction}_unclassified"`.

3. Returns `Dict[int, str]` mapping `message.id → cluster_label`.

---

## Stage 6: Evaluation Metrics

### `rpkclust/metrics.py`

**`compute_metrics(true_labels, pred_clusters) -> Tuple[float, float, float]`**

Pure-Python implementation of Homogeneity, Completeness, and V-measure (Rosenberg & Hirschberg, EMNLP 2007). Uses sklearn if available, falls back to pure Python.

- **Homogeneity**: `1 - H(C|K)/H(C)` — each cluster contains only members of a single class.
- **Completeness**: `1 - H(K|C)/H(K)` — all members of a given class are assigned to the same cluster.
- **V-measure**: `2 * h * c / (h + c)` — harmonic mean.
- All values clamped to `[0.0, 1.0]`.

**`evaluate_clusters_against_messages(messages, cluster_assignments)`**: Filters to messages with non-None `label` (ground truth), constructs true/predicted label arrays, delegates to `compute_metrics()`. Returns `(None, None, None)` if no labeled messages.

---

## Pipeline Orchestration

### `rpkclust/pipeline.py` — `run_pipeline`

**`run_pipeline(trace_or_messages, config, output_dir) -> Result`**

| Step | Stage | Function | Output | Timing |
|---|---|---|---|---|
| 1 | Config | `Config()` if none provided | Config object | — |
| 2 | Boundary | `find_boundary(messages, config, pairs)` | `BoundaryResult(B, hits, min_len)` | `t_boundary` |
| 3 | Candidates | `generate_candidates(messages, boundary, config)` | `List[Candidate]`, diagnostics | `t_cand` |
| 4 | Inference | `evaluate_stage1(...)` then `evaluate_stage2(...)` per direction | `KeywordResult` per direction | `t_infer` |
| 5 | Clustering | `cluster_messages(messages, keywords)` | `Dict[int, str]` | — |
| 6 | Metrics | `evaluate_clusters_against_messages(...)` | `(h, c, v)` | — |
| 7 | Export | JSON files if `output_dir` provided | `03_boundary.json`, `04_candidates.json`, `keywords.json`, `clusters.json` | — |

**Direction handling**: Runs inference per direction. Defaults to `["c2s", "s2c"]`. If no messages have `"c2s"` or `"s2c"` direction, falls back to `["both"]`.

**Diagnostics** assembled into `Result.diagnostics`:
```python
{
    "timing": {"total_sec", "boundary_sec", "candidates_sec", "inference_sec"},
    "boundary_b": B,
    "min_len": min_len,
    "hits_count": len(hits),
    "candidates_count": len(candidates),
    "metrics": {"homogeneity", "completeness", "v_measure"},
    "cand_diagnostics": {...},
    "directions": directions_to_run,
}
```

---

## Frontend / Backend Integration

### `rpkclust/api_runner.py` — JSON stdin/stdout API

Spawns as a subprocess via Vite middleware (`vite.config.ts`). Reads JSON from stdin, writes JSON to stdout. Dispatches on `data["cmd"]`:

| Command | Parameters | Returns |
|---|---|---|
| `get_sources` | — | `{"catalog": SOURCES}` |
| `benchmark_all` | `source_id` | Per-dataset benchmark results across all datasets in a source |
| `scaling_benchmark` | `source_id`, `protocol`, `dataset_id` | Scaling points at message counts `[100, 500, 1000]` (R-20) |
| `run_dataset` | `source_id`, `protocol`, `dataset_id`, `pcap_path`, `max_messages` | Full `Result` JSON with sample messages, boundary, candidates, keywords |
| `run_custom` | `text` | Full `Result` JSON from hex-lines input |
| `simulate_error` | `message` | Deliberately crashes for debugging |

### `vite.config.ts` — API Middleware

Intercepts `POST /api/run`, pipes request body to stdin of the Python subprocess, returns stdout as JSON. On Windows, the Python command is resolved by trying `['py', 'python']` (configurable via `PYTHON_CMD` env var); on Unix, `python3` is used. If the subprocess exits non-zero, the stderr is included in the error response.

### `src/App.tsx` — React Frontend

Single-file app with tab-based navigation. Uses `fetch('/api/run', {method: 'POST', ...})` for all backend communication. TypeScript interfaces mirror the Python dataclass field names. Key data flow:

1. On mount: calls `get_sources` (loads catalog), `benchmark_all` (loads all benchmarks), `scaling_benchmark` (loads scaling data).
2. When a dataset is selected: calls `run_dataset` with the selected source/dataset.
3. When hex input is submitted: calls `run_custom`.
4. Results populate the tab views: Boundary, Candidates, Keywords (with ranking tables), Clusters, Diagnostics (timing), Samples.

---

## Configuration Parameters

All hyperparameters live in `rpkclust/config.py` (`Config` dataclass). The full list with defaults:

### Boundary Detection
| Parameter | Default | Description |
|---|---|---|
| `boundary_per_direction` | `False` | Compute boundary separately per direction |
| `boundary_require_contiguous` | `False` | Require contiguous boundary |
| `boundary_min_msgs` | `20` | Minimum messages for meaningful boundary |
| `for_exclude_rules` | 7 rules | Semantic rules excluding FOR bytes from candidates |

### Candidate Generation
| Parameter | Default | Description |
|---|---|---|
| `fo_lengths_for_candidates` | `(1, 2, 4)` | FOR candidate window sizes |
| `tlv_t_lens` | `(1, 2)` | TLV Type field lengths (grid only, R-08) |
| `tlv_l_lens` | `(1, 2)` | TLV Length field lengths (grid only, R-08) |
| `tlv_endians` | `("big", "little")` | Endianness for TLV Length (grid only, R-08) |
| `tlv_auto_params` | `False` | Enable TLV grid search; default uses fixed (1,1,big) (R-08) |
| `tlv_min_repeats` | `2` | Min TLV type repeats |
| `tlv_min_coverage` | `0.6` | Min TLV parse coverage |
| `tlv_min_presence` | `0.8` | Min TLV type presence ratio |
| `tlv_max_type_cardinality` | `255` | Max distinct TLV types |
| `const_max_len` | `8` | Max constant field length |
| `seq_match_ratio` | `1.0` | Sequence exact-match threshold |
| `timestamp_slack_s` | `86400.0` | ±24h timestamp validity window |
| `sparse_ratio` | `0.02` | Max distinct-value ratio for sparse fields |
| `address_corr_threshold` | `-0.8` | Negative correlation threshold for address swap |
| `checksum_algorithms` | 7 algorithms | CRC/checksum algorithms to attempt |
| `float_min_distinct` | `5` | Min distinct float values |
| `candidate_max_distinct_ratio` | `None` | None=disabled. Opt-in high-cardinality filter (R-07) |
| `enable_float` | `False` | Included in `boundary_include_extra_rules` flag (R-05) |
| `enable_length` | `False` | Included in `boundary_include_extra_rules` flag (R-05) |

### Stage 1 Constraints
| Parameter | Default | Description |
|---|---|---|
| `stage1_top_k` | `5` | Top candidates carried to Stage 2 (R-19) |
| `sim_sample_size` | `200` | Messages sampled for similarity matrix |
| `sim_sample_pairs` | `20000` | Message pairs sampled for EER |
| `pair_min_ratio` | `0.3` | Min paired messages ratio for coupling |
| `struct_mode` | `"length"` | Structure consistency mode |
| `predicate_mode` | `"per_cluster"` | Constraints per-cluster or global |
| `stage1_normalize` | `False` | Min-max normalize candidate scores (R-10) |
| `norm_range` | `(0.1, 0.95)` | Range used when `stage1_normalize=True` |
| `prob_clip` | `None` | Hard clamp `(lo, hi)` for probabilities; default None = numeric guard only (R-12) |

### Stage 2 Self-Constraints
| Parameter | Default | Description |
|---|---|---|
| `pos_for` | `(0.95, 0.01, 0.70)` | (base, slope, floor) for FOR position |
| `pos_nfor` | `0.60` | NFOR position probability |
| `bituse_endian` | `"big"` | Endianness for bit-use MSB test (R-15) |
| `dmax_mode` | `"max_over_m"` | D_max computation mode for bit-use (R-14) |
| `cluster_label_mode` | `"per_direction"` | Cluster label direction (R-18) |

### I/O and General
| Parameter | Default | Description |
|---|---|---|
| `seed` | `0` | Random seed for reproducibility |
| `session_gap_s` | `300.0` | Idle timeout for session splitting |
| `direction_mode` | `"port"` | Direction assignment: `"port"`, `"first_packet"`, `"none"` |
| `max_candidates` | `64` | Max candidates after merge |
| `boundary_include_extra_rules` | `False` | Include Float/Length detectors in boundary scan (R-05) |

---

## Dataset Catalog

### `rpkclust/catalog.py`

Static registry of protocol datasets for the single source:

| Source | Datasets | Protocols |
|---|---|---|
| `netplier` | 7 | modbus, dnp3, dhcp, tftp, ntp, smb, smb2 |

**`get_catalog()`**: Returns a copy of `SOURCES` with `exists` (bool) and `file_size_kb` (float) added per dataset.

**`resolve_dataset(source_id, dataset_id)`**: Searches by source_id + dataset_id, falls back to global search by id or protocol name.

### `rpkclust/eval/ground_truth.py`

Protocol-specific ground-truth extraction (`extract_ground_truth_label`) and benchmarking (`run_benchmark_on_pcap`).

**`run_benchmark_on_pcap`**:
1. Loads PCAP trace via `load_pcap()`.
2. Protocol-specific cleaning:
   - **modbus**: Truncates to Modbus TCP length field (`data[4:6]` + 6 bytes max).
   - **smb/smb2**: Filters to SMB magic (`\xffSMB` / `\xfeSMB`) packets.
3. Extracts true labels, remaps message IDs, trims to `max_messages`.
4. Runs `run_pipeline()`, computes metrics, returns evaluation dict.

---

## Module Dependency Graph

```
model.py              (no deps)
config.py             (no deps)
detectors/base.py     → model, config
detectors/*.py        → base (Context, Hit), model, config
detectors/registry.py → base, all detectors, model, config
boundary.py           → model, config, detectors.registry
io/sessions.py        → model, config
io/loader.py          → model, config, io.sessions
candidates/for_region.py  → model, config
candidates/nfor_tlv.py    → model, config
candidates/__init__.py    → model, config, for_region, nfor_tlv
constraints/posterior.py  → (math only)
constraints/stage1.py     → model, config, constraints.posterior
constraints/stage2.py     → model, config, constraints.posterior
cluster.py               → model
metrics.py               → model
pipeline.py              → all of the above
cli.py                   → config, io.loader, pipeline, metrics
api_runner.py            → config, io.loader, pipeline, eval.ground_truth, catalog
eval/ground_truth.py     → model, config, io.loader, pipeline, metrics
catalog.py               → (os only)
```

---

## Testing

| Test File | Tests | Coverage |
|---|---|---|
| `test_fig1_pipeline.py` | 1 | End-to-end Figure 1 reproduction (8-message trace → B≥13, correct clustering) |
| `test_boundary.py` | 2 | Synthetic boundary detection + Figure 1 hex |
| `test_detectors.py` | 6 | Constant, Sequence, Timestamp, Sparse, Checksum, Length detectors |
| `test_candidates.py` | 2 | FOR candidate generation (excludes constants, includes sparse) + NFOR TLV detection |
| `test_stage1_constraints.py` | 3 | EER computation, star posterior monotonicity, Stage 1 ranking |
| `test_stage2_constraints.py` | 3 | Bit-use MSB test, position constraint formula, two-stage combination |
| `test_model_config.py` | 2 | Config JSON roundtrip, candidate extraction |

Run all tests: `python -m pytest tests/ -v` (19 tests, ~2-3 seconds).
