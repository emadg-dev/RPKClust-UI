# RPKClust-UI — Pages, Buttons & Knobs Reference

**Generated**: 2026-10-12
**Scope**: Every page (tab), button, knob, and control in the frontend (`src/`)

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [Global Header](#2-global-header)
3. [Hyperparameter Knobs Panel](#3-hyperparameter-knobs-panel)
4. [Dataset Provenance Bar](#4-dataset-provenance-bar)
5. [Page — Results](#5-page--results)
6. [Page — Charts](#6-page--charts)
7. [Page — Region Inspector](#7-page--region-inspector)
8. [Page — Pairwise Inspector](#8-page--pairwise-inspector)
9. [Page — Stage 1 & 2 Math](#9-page--stage-1--2-math)
10. [Page — Custom Trace](#10-page--custom-trace)
11. [Page — Pipeline](#11-page--pipeline)
12. [Stderr Drawer (Bottom Console)](#12-stderr-drawer-bottom-console)
13. [Backend API Commands](#13-backend-api-commands)
14. [Data Sources Catalog](#14-data-sources-catalog)
15. [Default Hyperparameters](#15-default-hyperparameters)

---

## 1. App Overview

RPKClust-UI is a research dashboard for binary protocol reverse engineering. It combines a Python backend (`rpkclust/`) with a React/TypeScript frontend. The app has **7 tabbed pages**, a global header, a collapsible hyperparameter panel, a dataset provenance bar, and a bottom stderr console.

**Tab list** (in order):
| # | Tab ID | Label | Icon |
|---|--------|-------|------|
| 1 | `results` | Results | Table |
| 2 | `charts` | Charts | BarChart3 |
| 3 | `inspector` | Region Inspector | Layers |
| 4 | `pairwise` | Pairwise Inspector | GitCompare |
| 5 | `stage2` | Stage 1 & 2 Math | Cpu |
| 6 | `custom` | Custom Trace | FileCode |
| 7 | `pipeline` | Pipeline | Activity |

**Communication**: All backend calls go through `POST /api/run` (Vite middleware in `vite.config.ts` spawns `python3 -m rpkclust.api_runner`, piping the request body to stdin and returning stdout as JSON).

---

## 2. Global Header

**Location**: `src/components/Header.tsx` — sticky top bar, always visible.

### Elements

| Element | Type | Function |
|---------|------|----------|
| **Logo + Title** | static | Binary icon + "RPKClust Results & Benchmarks" + "The Computer Journal 2025" badge + subtitle "Region-Partitioned Keywords Inference with Empirical Evaluation & Hyperparameter Controls" |
| **PCAP Source dropdown** | button + dropdown | FolderArchive icon; shows current source `short_name` + dataset count badge; opens a dropdown listing all sources with citation, trace count, and a Check mark on the selected one. Selecting a source sets `selectedSource` and triggers dataset reload. |
| **Tab buttons (7)** | button group | Switches `activeTab`. Active tab is highlighted (`bg-accent`). |
| **Hyperparameters Knobs** | toggle button | SlidersHorizontal icon; toggles `showKnobs` to show/hide the knobs panel below the header. Highlighted amber when open. |

---

## 3. Hyperparameter Knobs Panel

**Location**: `src/components/HyperparameterKnobs.tsx` — collapsible panel below the header.

### Top bar buttons

| Button | Icon | Function |
|--------|------|----------|
| **Reset to Defaults** | RotateCcw | Resets all params to `DEFAULT_PARAMS`. |
| **Apply & Re-evaluate** | Play | Re-runs `loadDataset(selectedSource, selectedDataset)` AND `runAllBenchmarks(benchmarkFilter)` with the current params. |

### Knob groups (4 cards in a grid)

#### Group 1 — "Candidate Windows & Sparsity" (amber)
| Knob | Type | Range / Options | Default | Function |
|------|------|-----------------|---------|----------|
| **Candidate Window Sizes L** | toggle buttons (multi-select) | `1B`, `2B`, `4B` | `[1, 2, 4]` | Sets `fo_lengths_for_candidates`. Toggling a size adds/removes it (sorted). At least one must remain. |
| **Sparse Ratio Threshold** | range slider | `0.005` – `0.08`, step `0.005` | `0.02` | Sets `sparse_ratio`. Threshold for the sparse detector. |

#### Group 2 — "Stage 1 Probabilistic Selection" (cyan)
| Knob | Type | Range / Options | Default | Function |
|------|------|-----------------|---------|----------|
| **Stage 1 Top-K Retention** | range slider | `1` – `10`, step `1` | `5` | Sets `stage1_top_k`. Number of fields passed to Stage 2. |
| **Similarity Sample Size** | range slider | `50` – `500`, step `50` | `200` | Sets `sim_sample_size`. Sample size for alignment-free similarity. |

#### Group 3 — "Position Constraint (Stage 2)" (emerald)
| Knob | Type | Range / Options | Default | Function |
|------|------|-----------------|---------|----------|
| **FOR Position Base** | range slider | `0.80` – `0.99`, step `0.01` | `0.95` | Sets `pos_for_base`. |
| **Position Slope** | range slider | `0.005` – `0.03`, step `0.005` | `0.01` | Sets `pos_for_slope`. Formula: `max(base − slope × offset, floor)` where floor = `0.70`. |

> Note: `pos_for_floor` (0.70), `pos_nfor` (0.60), and `bituse_endian` ('big') are in `DEFAULT_PARAMS` but have no UI knob — they are fixed.

#### Group 4 — "Active Detectors" (purple)
| Knob | Type | Options | Default | Function |
|------|------|---------|---------|----------|
| **Detector checkboxes** | checkboxes (8) | `constant`, `sequence`, `timestamp`, `checksum`, `address`, `float`, `length`, `sparse` | all 8 enabled | Sets `enabled_detectors`. These map to semantic exclusion rules. (Note: `sparse` is filtered out when serializing to `for_exclude_rules` for the backend.) |

---

## 4. Dataset Provenance Bar

**Location**: `src/components/DatasetProvenance.tsx` — panel below the knobs, above the active tab content. Always visible on every page.

### Elements

| Element | Type | Function |
|---------|------|----------|
| **Source name + citation** | static + link | Shows `currentSource.name`, a citation link (ExternalLink icon) to `currentSource.url`, and `currentSource.description`. |
| **Source selector buttons** | button group | One button per source in `sourcesCatalog`, showing `short_name` + `(dataset count)`. Clicking sets `selectedSource`. |
| **Message Count selector** | button group | **Only shown when `selectedSource === 'binaryinferno'`**. Buttons: `100 msgs`, `500 msgs`, `1000 msgs`. Sets `selectedMsgCount`. Triggers benchmark re-run for binaryinferno. |
| **Available PCAP Traces** | button group | One button per dataset in the current source, showing dataset `name` + `packets` count (`p` suffix). Clicking sets `selectedDataset` and triggers `loadDataset`. Selected dataset has a pulsing cyan dot. |

---

## 5. Page — Results

**Tab ID**: `results`
**Location**: `src/components/tabs/ResultsTab.tsx`
**Components**: `BoundaryDisplay` (benchmark), `ClusteringMetricsView` (table), `BaselineComparisonCard`

### Section 1: Boundary Detection Results (`BoundaryDisplay` variant=`benchmark`)

**Purpose**: Compares inferred boundary B against ground-truth protocol header lengths across datasets.

| Element | Type | Function |
|---------|------|----------|
| **Filter buttons** | button group | `All Sources` + one button per source `short_name`. Sets `benchmarkFilter` and re-runs `runAllBenchmarks(filter)`. |
| **Maximal Boundary Theorem** | badge | Static badge (accent2). |
| **Results table** | table | Columns: Source & Protocol, Category, Trace Packets, True Header/Boundary, RPKClust Inferred B, Error (Δ bytes), Evaluation Status. |
| **Row click** | row action | Clicking a row calls `onBenchmarkClick(source_id, dataset_id)` and switches to the `inspector` tab. |

### Section 2: Keyword Identification and Clustering Metrics (`ClusteringMetricsView` variant=`table`)

**Purpose**: Clustering evaluation based on Homogeneity (h), Completeness (c), V-measure (v).

| Element | Type | Function |
|---------|------|----------|
| **Re-evaluate** | button | RefreshCw icon; re-runs `runAllBenchmarks(benchmarkFilter)`. Spins while `benchLoading`. |
| **Metrics table** | table | Columns: Source & Protocol, True Keyword Field, Inferred Keyword, Keyword Error (Δ bytes), Homogeneity (h), Completeness (c), V-Measure (v), RPKClust Time. Keyword Error = |inferred offset − true offset| in bytes (c2s/both direction); emerald "0 bytes (Exact)" when offset and length both match, amber "0 bytes (len ΔN)" when only the length differs, rose with byte error otherwise, "–" when true or inferred keyword is unavailable. |

### Section 3: Cross-Method Comparison (`BaselineComparisonCard`)

**Purpose**: Compares RPKClust vs NetPlier vs AutoFormat.

| Element | Type | Function |
|---------|------|----------|
| **Comparison table** | table | Columns: Reverse Method, MSA Dependency, Execution Time (100 msgs), Average V-Measure, Region-Partitioning. RPKClust row is highlighted; its V-Measure is computed live (`rpkAvgV`). |

---

## 6. Page — Charts

**Tab ID**: `charts`
**Location**: `src/components/ClusteringMetricsView.tsx` (variant=`chart`)

### Elements

| Element | Type | Function |
|---------|------|----------|
| **Legend** | static | Three color keys: Homogeneity (h) = emerald, Completeness (c) = amber, V-Measure (v) = indigo. |
| **Grouped bar chart** | SVG | Up to 8 protocols (first 8 benchmarks). For each protocol, three bars (h/c/v) scaled 0–100%. Y-axis gridlines at 0/25/50/75/100%. X-axis labels are dataset names (truncated to 8 chars, uppercase). |

> Note: This page is a visual duplicate of the Clustering Metrics table on the Results page — same data, chart perspective.

---

## 7. Page — Region Inspector

**Tab ID**: `inspector`
**Location**: `src/components/tabs/InspectorTab.tsx`
**Components**: `MessageByteViewer` (single), `BoundaryDisplay` (diagnostic), `CandidateRankingView` (table)

### Top bar

| Element | Type | Function |
|---------|------|----------|
| **Active Trace badge** | static | Shows `currentDatasetMeta.name` + source name. |
| **Re-parse Trace** | button | RefreshCw icon (spins while `loading`); re-runs `loadDataset(selectedSource, selectedDataset)`. |

### Section 1: Byte-Level Message Region Highlighting (`MessageByteViewer` mode=`single`)

**Purpose**: Shows a single message's bytes with FOR/NFOR/Keyword highlighting.

| Element | Type | Function |
|---------|------|----------|
| **Legend** | static | FOR (amber, Offset 0..B−1), NFOR (orange), Inferred Keyword (cyan). |
| **Byte grid** | grid | One cell per byte showing offset index + hex value. Color-coded by region; keyword bytes highlighted cyan. Hover tooltip shows offset, region, keyword field. |
| **Previous / Next** | buttons | Navigate `selectedMessage` (packet X of Y). Disabled at bounds. |

### Section 2: Boundary Detection Diagnostics (`BoundaryDisplay` variant=`diagnostic`)

**Purpose**: Compact boundary diagnostics.

| Element | Type | Function |
|---------|------|----------|
| **Boundary Detection Diagnostics card** | stat rows | Inferred Boundary B (bytes), Minimum Packet Len (bytes), Generated Candidates (fields). |
| **Semantic Exclusion Hits card** | scrollable list | Lists detector hits: rule name (uppercase), Offset, Len, "Excluded" badge. Count in header. |

### Section 3: Factor Graph Candidate Rankings (`CandidateRankingView` mode=`table`)

**Purpose**: Step-by-step posterior probabilities across all constraints.

| Element | Type | Function |
|---------|------|----------|
| **Ranking table** | table | Columns: Region, Offset, Length, Stage 1 P(K=1), Bit-Use P_bit, Position P_pos, Final Bayesian Posterior, Status. Top row highlighted as "Inferred Keyword"; others show "Rank #N". |

---

## 8. Page — Pairwise Inspector

**Tab ID**: `pairwise`
**Location**: `src/components/PairwiseInspector.tsx`
**Components**: `MessageByteViewer` (aligned) + 5-stage gate stepper

**Purpose**: Aligns two messages with Needleman-Wunsch and evaluates them through 5 pipeline stages.

### Top bar — Quick Presets

| Button | Icon | Function |
|--------|------|----------|
| **Req ↔ Resp Pair** | ArrowLeftRight | Selects a paired request/response (by `paired_id` or same `session_id` + opposite direction). |
| **Same Cluster** | CheckCircle | Selects two messages in the same non-unclassified cluster. |
| **Diff Cluster** | XCircle | Selects two messages in different clusters. |
| **Custom Hex** | FileCode | Toggles custom hex input mode (two textareas for Message A / B raw hex). |
| **Swap** | RotateCcw | Swaps Message A and B (or swaps the two custom hex strings). |

### Message selection

- **Normal mode**: Two dropdown selectors (Message A, Message B) listing all messages: `#id [DIRECTION] (len B) - Cluster: X · [label]`. Each card shows length, direction badge (c2s=blue, s2c=emerald), cluster badge (purple).
- **Custom hex mode**: Two textareas for raw hex (sanitized to hex chars only).

### Sequence Alignment & Synchronized Hex Stream (`MessageByteViewer` mode=`aligned`)

| Element | Type | Function |
|---------|------|----------|
| **Color legend** | static | Match (=) emerald, Mismatch (≠) rose, Gap (–) dashed, FOR Region cyan. |
| **Alignment metrics ribbon** | 5 stat cards | Aligned Positions, Exact Matches (+ identity %), Mismatches, Gaps/Indels, Alignment Score. |
| **Split aligned hex stream** | grid | Column offsets header, FOR/NFOR region bar, Msg A bytes row, match connector row (|/≠/·), Msg B bytes row, ASCII preview row. Hover any cell for a tooltip with position, hex, offset, type, region, detector rule. Stage-gate highlights shown as cyan/purple outlines. |

### 5-Stage Pipeline Evaluation Gates

| Element | Type | Function |
|---------|------|----------|
| **Prev Stage / Next Stage** | buttons | Navigate `activeStage` (0–4). |
| **Stepper (5 cards)** | button group | Stage 01 Session & Direction Flow, Stage 02 FOR/NFOR Boundary Compliance, Stage 03 Candidate Keyword Extraction, Stage 04 Clustering Constraints & Similarity, Stage 05 Final Cluster Assignment Decision. Each shows status icon (pass=CheckCircle, fail=XCircle, diverged=AlertTriangle, neutral=Info) + badge text. |
| **Active stage gate card** | detail panel | Shows: stage badge, headline, explanation, pass/fail badge, Primary metric HUD, Secondary metric HUD, Formula, Diagnostic Summary, Details list, and relevant-offset highlights. |

**The 5 gates evaluate**:
1. **Session & Direction Flow** — paired req/resp vs same-direction vs cross-session.
2. **FOR/NFOR Boundary Compliance** — exact byte match ratio in [0, B); pass if ≥ 70%.
3. **Candidate Keyword Extraction** — compares candidate field values at the inferred keyword offset.
4. **Clustering Constraints & Similarity** — pairwise similarity S(A,B) vs EER threshold θ=0.55 → MUST-LINK / CANNOT-LINK.
5. **Final Cluster Assignment** — same cluster vs distinct; ground-truth verification.

---

## 9. Page — Stage 1 & 2 Math

**Tab ID**: `stage2`
**Location**: `src/components/CandidateRankingView.tsx` (mode=`chart`)

**Purpose**: Visualizes the top keyword candidate's Stage 2 bit-usage analysis.

### Elements

| Element | Type | Function |
|---------|------|----------|
| **Header** | static | "Stage 2 Self-Constraint: Bit-Usage Euclidean Distance Analysis" + subtitle with top candidate offset. |
| **Stat cards (3)** | stat | MSB Position (m), Euclidean Distance D, Bit-Use Probability P_bit. |
| **Bit-usage bar chart** | SVG | For each bit position k: two bars — Empirical Q(k) (cyan) vs Theoretical P(k) (amber). Y-axis gridlines at 0/0.25/0.50/0.75/1.00. X-axis labels k=1..N. |
| **Empty state** | static | "No bit-use evaluation data available for the selected candidate." when `q_k` is empty. |

> Note: This page shows only the single top candidate. The full per-direction Stage 2 table is in the Pipeline page (StageDetail → stage2).

---

## 10. Page — Custom Trace

**Tab ID**: `custom`
**Location**: `src/components/tabs/CustomTraceTab.tsx`

**Purpose**: Run RPKClust on a custom hex trace (or the pre-loaded motivating toy trace).

### Elements

| Element | Type | Function |
|---------|------|----------|
| **Header** | static | "Motivating Toy Trace & Custom Hex Input". |
| **Run RPKClust Pipeline** | button | Play icon; runs `runCustomTrace()` (cmd `run_custom`) with the textarea content + current params. |
| **Hex textarea** | textarea | 9 rows, pre-filled with `FIG1_HEX` (8 lines of the motivating trace). Placeholder: "Paste hex bytes per line". |
| **Summary stats (3)** | stat cards | Boundary B (bytes), Inferred Keyword (offset), Clusters (unique count). Shown after a successful run. |

---

## 11. Page — Pipeline

**Tab ID**: `pipeline`
**Location**: `src/components/tabs/PipelineTab.tsx`
**Components**: `PipelineFlow`, `StageDetail`, `HealthChecks`, `MessageTracker`

**Purpose**: Stage-by-stage trace of the RPKClust analysis with a per-message byte-level tracker.

### Top bar

| Element | Type | Function |
|---------|------|----------|
| **Mode toggle** | button group | `Dataset` / `Custom hex`. Switches `mode`. |
| **Run Pipeline Trace** | button | Play icon (shows "Running…" while loading); runs `runOverview()` (cmd `pipeline_trace`). Resets `selectedStage` to 'load'. |
| **Custom hex textarea** | textarea | Shown only in `custom` mode. 4 rows. |

### Idle / error / loading states

- **Idle**: Empty state with icon + "Run Pipeline Trace" button.
- **Error**: Rose error card with traceback.
- **Loading**: 8 pulsing skeleton stage cards.

### PipelineFlow (stage stepper)

**Location**: `src/components/pipeline/PipelineFlow.tsx`

Horizontal stepper with 8 stages, connected by lines. Each stage button shows: status icon (ok/warn/error/skipped/loading-spinner), stage `id`, `name`, `headline` + `ms`. Clicking a stage sets `selectedStage`.

**8 stages**: `load`, `boundary`, `tagging`, `candidates`, `stage1`, `stage2`, `cluster`, `metrics`.

### StageDetail (selected stage drill-down)

**Location**: `src/components/pipeline/StageDetail.tsx`

Renders the selected stage's detailed view. Header shows stage name, attention badges, status badge (OK/WARN/ERROR/SKIPPED), and `ms`. Error stages show a traceback pre.

| Stage | Component | Content |
|-------|-----------|---------|
| load | `LoadStage` | Sessions, Paired ratio, Raw msgs, Dropped by cleaning; per-direction table (Messages, Min/Median/Max len); length histogram; capture range; cleaning info. |
| boundary | `BoundaryDisplay` (pipeline) | Boundary B, min_len, True B (catalog) with MATCH/MISMATCH badge; boundary hits table (Rule, Offset, Length, Info). |
| tagging | `TaggingStage` | Total tags, Multi-tag bytes; tags-per-byte table with color-coded rule badges. |
| candidates | `CandidatesStage` | Pool size, FOR/NFOR counts, Rescued (sparse), True in pool; dropped windows; excluded bytes by rule; candidate pool table (Offset, Length, Region, Kind, TLV type, Distinct, Direction); S (available bytes). |
| stage1 | `Stage1Panel` | Per-direction top-K table: Rank, Keyword, Region, Clusters, Distinct, Singletons, p_m/p_r/p_s (raw + normalized with bar), p_d, p_f, Catalog (TRUE badge). |
| stage2 | `CandidateRankingView` (detailed) | Per-direction table: Rank, Keyword, Region, p_bit, p_offset, p_f, Posterior, S1 rank, MSB/D, Q(k) vs P(k) mini-chart, Catalog. Winner shown in header. |
| cluster | `ClusterStage` | Per-direction: keyword, none/unclassified counts; cluster table (Cluster key, Size, Example message ids). |
| metrics | `ClusteringMetricsView` (pipeline) | Homogeneity/Completeness/V-measure stat cards; per-cluster purity table; confusion (cluster × label) table. Shows "Metrics unavailable" when no ground-truth labels. |

### Health Checks (`HealthChecks`)

**Location**: `src/components/pipeline/HealthChecks.tsx`

Lists health items with severity (info=sky, warn=amber, error=red), id, stage badge, text, and optional JSON data. Shows "All checks passed." when empty.

### Consistency check panel

Inline panel showing whether recomputed posteriors match the pipeline (abs tol 1e-9). Lists skipped stages and any mismatches (Direction, Candidate, Field, Pipeline, Recomputed). Shows config fingerprint and non-default config.

### MessageTracker (per-message byte tracker)

**Location**: `src/components/pipeline/MessageTracker.tsx`

| Element | Type | Function |
|---------|------|----------|
| **Message selector** | dropdown + prev/next buttons | Lists messages: `#id · direction · len=N · cluster · label · ✓cached`. Prev/Next buttons (or `[` / `]` keys). |
| **Message metadata** | static | direction, length, session, paired, cluster, label, head_hex. |
| **Lens toggle** | button group | `Region`, `Status`, `Tags`, `In S`, `Satisfaction`. Switches the byte-grid coloring mode. |
| **Satisfaction controls** | 2 dropdowns | Shown only for `Satisfaction` lens: Rule select (constant/sequence/timestamp/sparse/checksum/address/float/length) + Length select (1/2/4). |
| **Byte grid** (`MessageByteViewer` mode=`grid`) | grid | 32 bytes per row. Each cell shows hex + offset. Color by lens. Click to select byte (or ←/→ keys). TRUE bytes marked with amber "T". Satisfaction lens shows width badges. |
| **ByteInspector** | panel | Rule matrix (windows covering selected byte: Rule, Window, Fires, msg_ok, blocking, fraction_ok, Detail) + value histogram at selected byte (top 12 across dataset). |
| **Candidate path** | `CandidatePathTable` | Expandable table of the message's candidate path: Id, Keyword, Region, Kind, Value, Cluster, Size, K, p_m/p_r/p_s/p_d/p_f, S1 rank, Posterior, S2 rank, Flags (WINNER/TRUE). Expanded row shows Similarity, Coupling, Structure, Dimension detail cards + Stage 2 bit-usage chart. |

---

## 12. Stderr Drawer (Bottom Console)

**Location**: `src/components/StderrDrawer.tsx` — fixed bottom bar, always present.

### Header bar (click to expand/collapse)

| Element | Type | Function |
|---------|------|----------|
| **Status badge** | badge | Terminal icon + "Python API Runner Console & Stderr". Shows: N Errors (rose, pulsing) / N Warnings (amber) / "Clean Stderr" (emerald). |
| **Last API status** | static | Last command, target, duration (ms). |
| **Auto-expand on error** | checkbox | Toggles `autoExpandOnError`. |
| **Simulate Error** | button | Bug icon; triggers a simulated Python exception (cmd `simulate_error`) to test the drawer. |
| **Copy Stderr** | button | Copy icon; copies all logs to clipboard (shows "Copied" for 2s). |
| **Clear** | button | Trash2 icon; clears all logs. |
| **Height S / M / L** | buttons | Compact (200px) / Medium (340px) / Large (480px). |
| **Expand/Collapse** | button | ChevronUp/ChevronDown. |

### Content (when open)

| Element | Type | Function |
|---------|------|----------|
| **Log tabs** | button group | `All Logs (N)`, `Errors Only (N)`, `Raw Stderr Stream`. |
| **Search filter** | text input | Filters logs by command, target, or stderr content. ✕ button clears. |
| **Log entries** | cards | Each shows: ERROR/WARNING badge, command, target, HTTP code, duration, timestamp, copy button, and formatted stderr (Traceback lines rose, File lines indented, Error/Exception lines rose-bordered, `[rpkclust.api_runner ERROR]` lines amber). |
| **Empty state** | static | "No Stderr Output Recorded" + "Trigger Simulated Test Error" button. |

---

## 13. Backend API Commands

All commands are sent via `POST /api/run` with a JSON body containing `cmd`. Defined in `src/hooks/useApiCall.ts` and `src/hooks/usePipelineTrace.ts`.

| Command | Trigger | Payload | Purpose |
|---------|---------|---------|---------|
| `get_sources` | App mount (`fetchSources`) | `{ cmd: 'get_sources' }` | Fetches the sources catalog. |
| `benchmark_all` | Run benchmarks | `{ cmd: 'benchmark_all', source_id, config }` | Runs all benchmarks for a source (or 'all'). |
| `run_dataset` | Load dataset | `{ cmd: 'run_dataset', source_id, dataset_id, config }` | Runs the pipeline on a dataset, returns `ProtocolDetails`. |
| `run_custom` | Custom trace run | `{ cmd: 'run_custom', text, config }` | Runs the pipeline on custom hex text. |
| `pipeline_trace` | Pipeline overview | `{ cmd: 'pipeline_trace', input, config }` | Returns `PipelineTraceResponse` (all 8 stages + health + consistency + messages). |
| `message_trace` | Per-message trace | `{ cmd: 'message_trace', input, config, message_id }` | Returns `MessageTraceResponse` (bytes, rules, histograms, candidate path, final). |
| `simulate_error` | Simulate Error button | `{ cmd: 'simulate_error', message }` | Triggers a simulated exception for testing the stderr drawer. |

**Config serialization** (`serializeParams` in App.tsx / PipelineTab.tsx):
```
fo_lengths_for_candidates, sparse_ratio, stage1_top_k, sim_sample_size,
pos_for: [base, slope, floor], pos_nfor, bituse_endian,
for_exclude_rules: enabled_detectors (minus 'sparse')
```

---

## 14. Data Sources Catalog

**Location**: `src/constants/index.ts` (`DEFAULT_SOURCES`)

| Source ID | Short Name | Citation | Datasets |
|-----------|-----------|----------|----------|
| `netplier` | NetPlier | Ye et al., IEEE S&P / USENIX Sec | 7 (Modbus TCP, DNP3 SCADA, DHCP, TFTP, NTP, SMBv1, SMBv2) — 100–114 packets each |
| `icsreal` | ICS Real | ICS-Security-Tools | 7 (same protocols, "Real") — 100–4901 packets each |

Each dataset defines: `id`, `name`, `protocol`, `file`, `category`, `packets`, `header_len`, `keyword_field`, `true_keyword` (offset, length, region, name, bits), `expected_B`, `description`.

**Baseline comparisons** (`BASELINE_COMPARISONS`):
| Method | MSA | Time (100 msgs) | Avg V | FOR-aware |
|--------|-----|-----------------|-------|-----------|
| RPKClust (Ours) | None (Alignment-Free) | 0.2s–1.9s | (live) | Yes (FOR/NFOR Partitioned) |
| NetPlier (NDSS 21) | Global (MAFFT) | 12.4s–180s | 82.1% | No |
| AutoFormat (08) | Pairwise Needleman | 30.0s–140s | 68.2% | No |

---

## 15. Default Hyperparameters

**Location**: `src/constants/index.ts` (`DEFAULT_PARAMS`)

| Parameter | Default | UI Knob? |
|-----------|---------|----------|
| `fo_lengths_for_candidates` | `[1, 2, 4]` | Yes (toggle buttons) |
| `sparse_ratio` | `0.02` | Yes (slider) |
| `stage1_top_k` | `5` | Yes (slider) |
| `sim_sample_size` | `200` | Yes (slider) |
| `pos_for_base` | `0.95` | Yes (slider) |
| `pos_for_slope` | `0.01` | Yes (slider) |
| `pos_for_floor` | `0.70` | No (fixed) |
| `pos_nfor` | `0.60` | No (fixed) |
| `bituse_endian` | `'big'` | No (fixed) |
| `enabled_detectors` | all 8 | Yes (checkboxes) |

**Motivating toy trace** (`FIG1_HEX`): 8 hex lines (Read/Response/Write pairs) pre-loaded in the Custom Trace page.

---

## Appendix: Component → Page Map (post-refactor)

| Unified Component | Modes/Variants | Used In |
|-------------------|----------------|---------|
| `MessageByteViewer` | `single` / `grid` / `aligned` | Region Inspector (single), Pipeline MessageTracker (grid), Pairwise Inspector (aligned) |
| `CandidateRankingView` | `table` / `detailed` / `chart` | Region Inspector (table), Pipeline StageDetail stage2 (detailed), Stage 1 & 2 Math page (chart) |
| `BoundaryDisplay` | `diagnostic` / `benchmark` / `pipeline` | Region Inspector (diagnostic), Results (benchmark), Pipeline StageDetail boundary (pipeline) |
| `ClusteringMetricsView` | `table` / `chart` / `pipeline` | Results (table), Charts page (chart), Pipeline StageDetail metrics (pipeline) |
| `BitUsageChart` | (sub-component) | CandidateRankingView detailed, CandidatePathTable expanded rows |
| `usePipelineData` | (hooks) | Shared data extraction across components |
