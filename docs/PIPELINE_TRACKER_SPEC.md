# PIPELINE_TRACKER_SPEC.md

Feature: a new UI page, **Pipeline Tracker**, that shows (A) the whole RPKClust pipeline for the
current process with the state of every stage, and (B) a single message tracked through every stage,
showing for each byte which constraints it satisfies or violates.

This file is the contract. Read it fully before touching code. Where it says "mirror the
implementation", the page must explain what the CODE does, not what the paper says.

---

## 0. Hard constraints (read first)

1. **Read-only instrumentation.** Nothing in this feature may change the algorithm's output.
   Same input + same Config must produce byte-identical `keywords.json`, `clusters.json` and metrics
   with tracing on or off. A test enforces this (section 6).
2. **Do not modify** detector logic, candidate generation logic, stage-1/stage-2 math, clustering
   logic or Config defaults as part of this task. Fixes to those are being done separately, step by step.
   If you find a bug, report it in your final message; do not fix it here.
3. **Ground-truth labels are display-only.** `Message.label`, `PROTOCOL_TRUE_KEYWORD` and catalog
   `true_keyword` may only be used to decorate output (badges, "TRUE" markers, purity). They must never
   flow into any inference function.
4. **Deterministic.** Same request twice gives the same JSON (use `config.seed` wherever sampling happens).
5. **JSON-safe.** bytes -> lowercase hex strings, no NaN/Infinity (use `null`), tuples -> lists,
   dict keys that are bytes -> hex strings, `None` cluster key -> the string `"__none__"`.
6. **Windows-friendly.** The dev machine is Windows (`py` launcher, PowerShell). Use `pathlib`/`os.path`,
   no shell-specific commands in code or tests.
7. Keep the existing UI style: Tailwind, dark `slate-950/900/800` palette, `rounded-2xl border border-slate-800`
   cards, `font-mono text-xs` for data, `lucide-react` icons, same Header/tab pattern.
8. All backend calls go through the existing `useApiCall().executeApiCall` so errors/stderr show up in the
   existing StderrDrawer. Do not call `fetch` directly.

---

## 1. What the user sees

### 1.1 New tab
Add tab id `pipeline`, label **"Pipeline Tracker"**, icon `Workflow` (or `GitBranch`) in `Header.tsx` TAB_ITEMS and in the
`ActiveTab` union (`src/types/index.ts`). Render `<PipelineTab />` from `App.tsx`.

### 1.2 Page layout (top to bottom)
1. **Process bar**: input source toggle `Selected dataset` | `Custom trace (Fig 1 & Custom tab)`, message cap
   (100 / 500 / 1000), a **Run / Re-run** button, total runtime, config fingerprint (short hash of the config
   sent), and a "consistency" badge (section 3.7).
2. **Pipeline flow** (horizontal stepper of stage cards, wraps on small screens). Each card shows:
   status dot (ok / warn / error / skipped), stage name, one headline number, runtime in ms.
   Clicking a card opens its detail panel below. Arrows between cards show what is handed over
   (e.g. `B=245`, `44 candidates`, `top-5`).
3. **Stage detail panel** (section 1.3) for the selected stage.
4. **Health checks** list (section 3.6): collapsible, each item has severity, text and a "jump to stage" link.
5. **Message Tracker** (section 1.4): selector + byte grid + inspector + candidate path.
   Selecting a message here also works from any stage panel that lists messages (click a message id).

### 1.3 Stages (ids are stable API identifiers)

| id | Name | Headline | Detail panel must show |
|---|---|---|---|
| `load` | Load & preprocess | `N msgs, P pairs` | counts per direction, sessions, paired ratio, min/median/max length per direction, length histogram (top 12), capture range, dataset file, how many messages dropped by protocol cleaning (modbus truncate, smb/smb2 magic filter) |
| `boundary` | FOR/NFOR boundary | `B=..` | B, min_len, first-match hits table (rule, offset, length, info), warning if `B == min_len`, a strip of `[0,min_len)` coloured FOR/NFOR with hit markers, true B from catalog (display only) |
| `tagging` | Semantic tagging | `K tags` | the hit list actually handed to candidate generation (whatever `pipeline.py` passes as `cand_boundary.hits`; do not assume it equals the boundary hits), grouped by byte: byte -> list of rules. Marks bytes with multiple tags |
| `candidates` | Candidate generation | `M candidates` | excluded bytes with reasons, rescued-by-sparse bytes, set S, pool table (offset, len, region, kind, distinct count), why each window was dropped (constant, cardinality, not aligned, not continuous, short message) with counts, true keyword in pool (Y/N, display only), pool size warning |
| `stage1` | Stage 1 constraints | `top: off/len` | per direction table of ALL candidates: `#clusters, #distinct, singletons, p_m, p_r, p_s, p_d, p_f, rank`, normalized vs raw values if normalization is on, top-K cut line, TRUE row highlighted, active config (normalize, clip, predicate_mode, top_k) |
| `stage2` | Stage 2 self-constraints | `winner: off/len` | per direction table for top-K: `p_bit, p_offset, p_f, posterior, final rank`, bit-use chart (Q(k) vs P(k)) for a selectable candidate, rows where `posterior` ties at full precision flagged, "stage 2 overrode stage 1" flag |
| `cluster` | Clustering | `C clusters` | per direction: keyword used, cluster list (value hex, size, example message ids), `none`/`unclassified` counts |
| `metrics` | Evaluation | `v=..` | h, c, v (only when labels exist, else "no ground truth"), purity per cluster, confusion table cluster x true label (top 10) |

Every stage card has `status`:
- `ok`, `warn` (any health check of severity warn attached to the stage), `error` (stage threw, downstream stages become `skipped`), `skipped`.

### 1.4 Message Tracker

**Selector**: dropdown + prev/next + "jump to paired message" + direction/cluster badges, same style as
`InspectorTab`/`ByteHexView`. Shows message id, direction, length, session, ground-truth label (display only,
labelled "ground truth (eval only)").

**Byte grid** (one cell per byte, like `ByteHexView`, wraps; for messages > 512 bytes show the first 512 and a note).
A **lens switcher** colours the grid. Lenses (single-select):

| lens id | Colours bytes by |
|---|---|
| `region` | FOR / NFOR, boundary marker, byte beyond `min_len` shown dimmed ("rules cannot be evaluated here") |
| `tags` | rule tags covering the byte (constant, sequence, timestamp, sparse, address, checksum, float, length); multi-tag bytes show a stacked badge |
| `status` | final per-byte status: `excluded` (hard), `rescued-by-sparse`, `available (in S)`, `not evaluated` |
| `candidates` | bytes covered by pool candidate windows; ring on top-K; strong ring on the winning keyword |
| `satisfaction` | for the **selected rule** (rule dropdown): green = this message satisfies the rule at this byte, red = violates, amber = rule undecided/n.a., grey = beyond min_len |
| `keyword` | the winning keyword per this message's direction, the TRUE keyword (display only), overlap |

Clicking a byte (or a window of bytes: shift-click extends) opens the **Byte Inspector** panel (right/below):

1. Byte identity: offset, hex, ascii, region, S-membership.
2. **Rule matrix for this byte** (section 3.4): one row per `(rule, window length)` whose window covers this byte,
   columns: `fires (dataset)`, `this message ok`, `blocking`, `fraction of messages ok`, `detail` text.
   `blocking = true` means "this message is (one of) the reason(s) the rule does not fire at the dataset level".
   Example detail: `constant: 3 distinct values, modal 0x01 share 45/53`, `sparse: unique=5/256, zero present in 4 msgs (7.5%)`.
3. **Candidate windows covering this byte**: list; clicking one scrolls to its row in the Candidate Path table.
4. Byte history across the dataset for this offset: value histogram (top 12) with this message's value highlighted.

**Candidate Path table** (below the grid): the message's journey through stage 1/2 for every pool candidate
of the message's direction (top-K first, then others, collapsible):

| column | meaning |
|---|---|
| candidate | `off/len`, region, kind, TLV type if any |
| extracted value | hex or `none` (absent) |
| cluster | cluster key, cluster size / total, `#clusters` |
| similarity | mean sim to same-cluster peers vs to other clusters (sampled), n peers |
| coupling | partner message id, partner's value under the same candidate, share of cluster whose partner is in the dominant partner cluster. Mirror the implementation (see 3.5) |
| structure | message length, cluster median length, deviation / max_len |
| dimension | candidate-level `r_distinct`, `r_single`, p_d |
| stage-1 | p_m, p_r, p_s, p_d, p_f, rank |
| stage-2 | integer value, MSB, p_bit, p_offset, posterior, final rank (only top-K) |
| verdict chips | `in top-K`, `winner`, `TRUE keyword` (display only) |

**Final panel**: final cluster id for this message, cluster size, ground-truth label, whether the
cluster is pure (eval only), and the sentence "assigned by keyword off/len of direction X".

Every number shown must come from the backend response. The frontend must not recompute probabilities.

---

## 2. Files to add / change

### Backend (`rpkclust/`)
| file | change |
|---|---|
| `rpkclust/trace.py` | NEW. All tracing logic (section 3). No algorithm logic duplicated: call existing functions, recompute only the *per-message* decorations |
| `rpkclust/pipeline.py` | add optional `capture: bool = False` to `run_pipeline`; when True store intermediates in `Result.trace` (a `PipelineCapture` dataclass in `model.py`). No other behavior change |
| `rpkclust/model.py` | add `PipelineCapture` dataclass, add `trace: Optional[PipelineCapture] = None` to `Result` |
| `rpkclust/api_runner.py` | new cmds `pipeline_trace` and `message_trace` (section 4) |
| `tests/test_trace.py` | NEW (section 6) |

### Frontend (`src/`)
| file | content |
|---|---|
| `src/types/index.ts` | add types (section 4.3), extend `ActiveTab` with `'pipeline'` |
| `src/components/Header.tsx` | add tab item |
| `src/App.tsx` | state for pipeline data, render `PipelineTab` |
| `src/components/tabs/PipelineTab.tsx` | page container |
| `src/components/pipeline/PipelineFlow.tsx` | stepper of stage cards |
| `src/components/pipeline/StageDetail.tsx` + `stages/*.tsx` | one small component per stage panel |
| `src/components/pipeline/HealthChecks.tsx` | health list |
| `src/components/pipeline/MessageTracker.tsx` | selector + grid + inspector + candidate path |
| `src/components/pipeline/ByteLensGrid.tsx` | grid with lenses |
| `src/components/pipeline/ByteInspector.tsx` | rule matrix and histogram |
| `src/components/pipeline/CandidatePathTable.tsx` | per-message candidate path |
| `src/hooks/usePipelineTrace.ts` | calls `executeApiCall`, keeps loading/error/cache state |

---

## 3. Backend design

### 3.1 Capture (pipeline.py)
`run_pipeline(trace_or_messages, config, output_dir=None, capture=False)`.
When `capture=True`, build and attach `PipelineCapture` with exactly these (all already computed today):
- `messages`, `pairs`, `capture_range`
- `boundary` (BoundaryResult from `find_boundary`)
- `tag_hits`: the hit list passed to `generate_candidates` (whatever it currently is)
- `cand_boundary`
- `candidates`, `cand_diagnostics` (including `for_diagnostics` / `nfor_diagnostics`)
- `stage1: Dict[direction, Stage1Result]`, `stage2: Dict[direction, KeywordResult]`
- `clusters`
- `timing` per stage (`load` is measured by the api layer; boundary, tagging, candidates, stage1, stage2, cluster, metrics measured in pipeline). Split the existing combined timers if needed, without changing logic.
- `errors`: stage id -> traceback string, if a stage raised (the pipeline must still raise as before when `capture=False`; with capture=True catch per stage, record, mark downstream skipped, and return a partial capture).

### 3.2 `rpkclust/trace.py` public API
```python
def build_overview(capture, meta, config) -> dict            # pipeline_trace response
def build_message_trace(capture, message_id, config) -> dict # message_trace response
def health_checks(capture, meta, config) -> list[dict]
def consistency_check(capture, config) -> dict
```
`meta` = source_id, dataset_id, protocol, file, cleaned-message counts, true keyword spec (display only).

### 3.3 Dataset-level rule evaluation (`rule_matrix`)
For every offset `o < min_len` (cap at `max_offsets`, default 300) and every rule in `BOUNDARY_RULES + EXTRA_RULES`
and every length `l` in `rule.lengths` with `o + l <= min_len`:
- `fires`: call the real detector `check()` with the same `Context` the pipeline uses. This is the source of truth.
- `fraction_ok`: share of target messages that individually satisfy the rule (3.4).
- `detail`: short string with the numbers behind the decision.
Use the direction-agnostic message set that `find_boundary` used (all messages, unless `boundary_per_direction`).
Cache by `(rule, o, l)`. Must run in a few seconds for 1000 messages x 300 offsets (vectorize with numpy where the
detectors allow; evaluating `check()` itself is allowed to use the existing implementation).

### 3.4 Per-message satisfaction (`msg_ok`, `blocking`)
Detectors are conservative (ALL messages must satisfy). For a message `m` and a rule evaluation:

| rule | `msg_ok` for message m | `blocking` |
|---|---|---|
| constant | m's slice equals the modal slice | `not msg_ok` and the rule would fire if m were removed (sole outlier) |
| sequence | step to previous message in timestamp order (same direction) equals the modal step | m's step differs from modal step and removing m would make the rule fire |
| timestamp | decoded value (both endians, both encodings the detector tries) inside `[t_start-d, t_end+d]` | not ok and sole violator |
| sparse | slice != all-zero and value in the dataset's value set when the set satisfies the size limits | message value is zero (when zero is what makes the rule fail), or message is the sole extra distinct value that pushes unique count over the limit. Mirror the extra limits for `k=2` and `sparse_allow_zero_frac` if they exist in `sparse.py` |
| address | swap relation holds between m and its paired message | pair exists and swap fails |
| checksum | some configured algorithm over the detector's data range equals the field for m (store algorithm and endian) | not ok and sole violator |
| float | decodes to a plausible float per `float_rule.py` | not ok and sole violator |
| length | `value + c == len(m)` (or the remaining-length variant) for the modal `c` | not ok and sole violator |

If a rule cannot be evaluated for m (no pair, beyond the message length, rule disabled in config) set `msg_ok = null`.
`blocking = false` whenever the rule already fires.
Implementation note: "sole violator" is computed by counting violators; a rule is "blocked by m" only if
`violators == {m}`. For rules with a tolerance (`sparse_allow_zero_frac`, length 0.9 ratio) define blocking as
"removing m flips `fires`", computed by re-running the check on the reduced slice list. Cap this to 50 messages per
evaluation to bound runtime; beyond that report `blocking = null`.

### 3.5 Candidate path per message
Reuse functions from `constraints/stage1.py` (`compute_pairwise_similarity`, EER helpers) and the cluster dict stored
in `ScoredCandidate.clusters`. **Mirror whatever stage1.py currently computes** for p_r and p_s; do not implement
the paper's version. Concretely:
- `similarity.inner_mean/inter_mean/n_peers`: mean `compute_pairwise_similarity` of m against up to 20 sampled peers in the same cluster and up to 20 in other clusters (seeded).
- `coupling`: `partner_id` from `pairs`, partner's value under the same candidate extractor (if the partner is in the other direction, note it), plus the quantities stage1.py actually uses for the cluster of m (print the formula string used, e.g. `"mean pairwise sim of up to 5 partner messages"`).
- `structure`: `len(m)`, cluster median length, `abs(len-median)/max_len` using the exact formula in stage1.py.
- `dimension`: `r_distinct`, `r_single`, `p_d` as computed.
- `stage2`: int value (config.bituse_endian), `msb` (null for value 0 per the zero-skip rule), Q(k)/P(k) arrays from `compute_bit_use_prob` details, `p_offset`.
Each sub-object carries `formula` (string describing the implementation) so the UI can show "how this was computed".

### 3.6 Health checks (all derived from data; each item `{id, severity: info|warn|error, stage, text, data}`)
- `boundary_equals_min_len` (warn): `B == min_len`.
- `min_len_small` (warn): `min_len < 0.25 * median_len`: a few short messages cap the boundary (seen on real DNP3).
- `no_pairs` / `low_pair_ratio` (warn): paired ratio < `pair_min_ratio`; coupling is neutral.
- `true_keyword_not_in_pool` (error, display-only): catalog true keyword missing from the pool. Include probable reason: offset >= B, byte excluded (with the exclusion rules), byte not in S, window not continuous.
- `true_keyword_rank` (info/warn): stage-1 rank per direction and whether it is inside `stage1_top_k`.
- `pool_too_large` (warn): pool > 40.
- `pool_tiny` (warn): pool <= 2.
- `posterior_ties` (warn): top-2 posteriors equal at full float precision, or equal to the clip bound.
- `bitscore_zero` (warn): any top-K candidate with `p_bit` exactly 0 or at the clip bound.
- `degenerate_candidates` (info): count of candidates with 1 cluster or all singletons.
- `stage2_override` (info): winner's stage-1 rank > 1 (and > top_k never happens by construction).
- `direction_unbalanced` (warn): a direction has < 5 messages.
- `labels_missing` (info): no ground truth, metrics skipped.
- `config_nondefault` (info): list of Config fields that differ from `Config()` defaults.

### 3.7 Consistency check
Recompute, with `trace.py`'s own code paths, the per-candidate `p_m`, `p_s`, `p_d` and the stage-2 `p_bit`, `p_offset`
for every candidate and compare against the values stored by the pipeline (abs tol 1e-9).
Return `{ok: bool, mismatches: [{direction, candidate, field, pipeline, recomputed}]}`. This protects the UI from
silently drifting from the algorithm. Skip `p_r` if it cannot be recomputed exactly, and say so in `skipped`.

### 3.8 Performance and size
- `pipeline_trace`: whole run + overview, target < 10 s for 1000 messages. No per-message byte data except the list of
  message summaries (id, direction, length, cluster, label, session, paired_id, first 32 bytes hex).
- `message_trace`: re-runs the pipeline (deterministic) with `capture=True`, builds one message. Target < 12 s.
  Optional: cache the capture on disk keyed by `sha1(file mtime + size, config json, max_messages, protocol)` under
  the temp directory; the cache must never be required for correctness.
- Cap response at ~3 MB; truncate byte-level arrays at 512 bytes and set `truncated: true`.

---

## 4. API

Both go through the existing `/api/run` -> `api_runner.process_request`. Keep the same envelope
(`status: "ok" | "error"`, `message`, `trace`).

### 4.1 `pipeline_trace`
Request:
```json
{
  "cmd": "pipeline_trace",
  "input": { "kind": "dataset", "source_id": "netplier", "dataset_id": "modbus", "max_messages": 100 },
  "config": { ...same serializeParams() as other commands... }
}
```
or `"input": { "kind": "custom", "text": "<hex lines>" }`.
Dataset loading and protocol cleaning must call the same helpers as `run_benchmark_on_pcap` / `run_dataset`
so the message set equals what the Results tab evaluates. Factor the shared cleaning into one function; do not copy it.

Response (abridged; field names are the contract):
```json
{
  "status": "ok",
  "meta": { "source_id": "", "dataset_id": "", "protocol": "", "file": "", "n_messages": 0,
            "true_keyword": { "offset": 7, "length": 1, "name": "Function Code" } | null,
            "config_fingerprint": "ab12cd34", "config_nondefault": { } },
  "stages": [
    { "id": "load", "name": "Load & preprocess", "status": "ok", "ms": 12, "headline": "100 msgs, 46 pairs",
      "summary": { }, "attention": ["health_check_id", ...] },
    ...
  ],
  "load":       { "per_direction": {"c2s": {"n":0,"min":0,"median":0,"max":0}, "s2c": {} },
                  "sessions": 0, "paired_ratio": 0.0, "length_hist": [[10, 12]], "capture_range": [0, 0],
                  "dropped_by_cleaning": 0 },
  "boundary":   { "B": 0, "min_len": 0, "hits": [ {"rule":"","offset":0,"length":1,"info":{}} ], "true_B": null },
  "tagging":    { "n_hits": 0, "by_byte": { "5": ["constant","length"] }, "multi_tag_bytes": [5] },
  "candidates": { "pool": [ {"offset":0,"length":1,"region":"FOR","kind":"window","tlv_type":null,"distinct":0,"direction":"both"} ],
                  "excluded": { "2": ["constant","length"] }, "rescued": [5], "S": [0,1,5],
                  "dropped": { "constant_window": 0, "cardinality": 0, "not_aligned": 0, "not_continuous": 0, "short_message": 0 },
                  "true_in_pool": true | false | null },
  "stage1": { "c2s": { "top_k": 5, "rows": [ { "offset":0,"length":1,"region":"FOR","n_clusters":0,"n_distinct":0,"singletons":0,
                        "raw": {"p_m":0,"p_r":0,"p_s":0}, "p_m":0,"p_r":0,"p_s":0,"p_d":0,"p_f":0,"rank":1,
                        "is_true": false } ] }, "s2c": { } },
  "stage2": { "c2s": { "winner": {"offset":0,"length":1}, "rows": [ { "offset":0,"length":1,"p_bit":0,"p_offset":0,"p_f":0,
                        "posterior":0,"rank":1,"stage1_rank":1,"is_true":false,
                        "bits": {"msb":0,"D":0,"D_max":0,"q_k":[],"p_k":[]} } ] }, "s2c": { } },
  "cluster":  { "c2s": { "keyword": {"offset":0,"length":1}, "clusters": [ {"key":"01","size":0,"examples":[0,2,4]} ],
                         "none": 0, "unclassified": 0 }, "s2c": { } },
  "metrics":  { "available": true, "homogeneity": 0, "completeness": 0, "v_measure": 0,
                "per_cluster": [ {"cluster":"c2s_01","size":0,"purity":1.0,"top_label":"01"} ],
                "confusion": [ {"cluster":"","label":"","count":0} ] },
  "health":   [ { "id":"", "severity":"warn", "stage":"boundary", "text":"", "data":{} } ],
  "consistency": { "ok": true, "mismatches": [], "skipped": ["p_r"] },
  "messages": [ { "id":0,"direction":"c2s","length":0,"session_id":0,"paired_id":1,"cluster":"c2s_01",
                  "label":"01","head_hex":"..." } ]
}
```

### 4.2 `message_trace`
Request: same `input` and `config` plus `"message_id": 12`.
Response:
```json
{
  "status": "ok",
  "message": { "id":12,"direction":"c2s","length":0,"session_id":0,"paired_id":13,"label":"01","hex":"...","truncated":false },
  "bytes": [ { "offset":0, "hex":"05", "ascii":".", "region":"FOR", "beyond_min_len":false,
               "status":"excluded|rescued|available|not_evaluated",
               "tags":["constant","sparse"], "exclusion_reasons":["constant"], "in_S":false,
               "candidate_ids":[3,7] } ],
  "rules": [ { "rule":"sparse","offset":7,"length":1,"fires":true,"msg_ok":true,"blocking":false,
               "fraction_ok":1.0,"detail":"unique=4/256 ratio=0.0156 zero=no","info":{} } ],
  "offset_histograms": { "7": [["01",17],["02",11]] },
  "candidate_path": [ { "candidate_id":3,"offset":7,"length":1,"region":"FOR","kind":"window","tlv_type":null,
                        "value":"01","cluster_key":"01","cluster_size":17,"n_clusters":4,
                        "similarity": {"inner_mean":0.0,"inter_mean":0.0,"n_inner":0,"n_inter":0,"formula":""},
                        "coupling":   {"partner_id":13,"partner_value":"81","cluster_pr":0.0,"formula":""},
                        "structure":  {"length":0,"cluster_median":0,"deviation":0.0,"cluster_ps":0.0,"formula":""},
                        "dimension":  {"r_distinct":0.0,"r_single":0.0,"p_d":0.95},
                        "stage1": {"p_m":0,"p_r":0,"p_s":0,"p_d":0,"p_f":0,"rank":1},
                        "stage2": {"in_top_k":true,"int_value":1,"msb":0,"p_bit":0,"p_offset":0,"posterior":0,"rank":1,
                                   "q_k":[],"p_k":[]} | null,
                        "is_winner":false,"is_true":false } ],
  "final": { "cluster":"c2s_01","cluster_size":0,"keyword":{"offset":7,"length":1},"label":"01","cluster_pure":true | null }
}
```
`candidate_ids` index into `candidate_path[*].candidate_id` (stable ids = index in the pool).
`rules` lists only windows that cover at least one byte of this message, ordered by offset, rule order from the registry.

### 4.3 TypeScript types
Mirror 4.1 / 4.2 exactly in `src/types/index.ts` (`PipelineStageId`, `PipelineStage`, `PipelineTraceResponse`,
`MessageTraceResponse`, `ByteInfo`, `RuleEval`, `CandidatePath`, `HealthItem`). No `any` for the new types.
Optional fields are `T | null`, not `undefined`.

---

## 5. Frontend behaviour details

- `usePipelineTrace(sourceId, datasetId, customText, mode, maxMessages, params)` returns
  `{ overview, overviewState, runOverview, trace, traceState, loadTrace(messageId) }`.
  Cache message traces in a `Map<messageId, MessageTraceResponse>` for the current overview run; clear on re-run.
- Do not auto-run on mount (the existing tabs already trigger heavy runs). The page shows an empty state with a
  Run button. If `protoDetails` already exists for the selected dataset, still require the explicit Run.
- Loading: skeletons on the stage cards; the stepper cards must render as soon as `stages` arrive.
- Errors: show the backend `message` in a red card and keep the StderrDrawer behaviour. If a stage has status
  `error`, show its traceback in that stage's panel.
- Selecting a message in the tracker triggers `loadTrace` (debounced 150 ms). Prev/next must not refetch cached ones.
- Lens `satisfaction` needs a rule: dropdown of rules plus window length (1/2/4 where applicable). Cells use
  `rules[*]` for windows starting at that byte; a byte covered only by wider windows uses the narrowest covering window and
  shows a small `w=2` marker.
- Keyboard: left/right arrows move the selected byte, `[`/`]` previous/next message when the grid is focused.
- Accessibility: every colour state has a text/icon marker (not colour only).
- True keyword markers are labelled "TRUE (catalog, eval only)". They never change ordering or styling of algorithmic output beyond a badge.
- Responsive down to ~1100px; wide tables get `overflow-x-auto`.
- Do not reuse the `BoundaryResultsTable` logic (it compares the inferred B with itself; known issue, out of scope).

---

## 6. Tests and acceptance

### Backend tests (`tests/test_trace.py`, runnable with `py tests\run_tests.py` as plain functions, no pytest-only features)
1. **No-behavior-change**: for the Fig 1 toy trace and one synthetic protocol, `run_pipeline(capture=False)` vs
   `run_pipeline(capture=True)` give identical `keywords` (offset, length, posterior), `clusters`, and metrics.
2. **Determinism**: `build_message_trace` twice gives equal JSON.
3. **JSON safety**: `json.dumps(response, allow_nan=False)` succeeds.
4. **Fig 1 fixture**: byte 12 of message 0 has tag `sparse`, is in `S`, covered by candidate `12/1`, rule row
   `sparse@12/1` has `fires=true`, `msg_ok=true`. Byte 0..1 `constant` with `msg_ok=true`.
5. **Blocking logic**: synthetic set where all messages share byte 5 except one -> `constant@5/1` `fires=false`,
   `blocking=true` only for that one message, `msg_ok=false` for it and true for others.
6. **Label isolation**: with all `Message.label` set to `None` the overview's stages 1-5 are identical; only `metrics` changes.
7. **Consistency**: `consistency_check(...)["ok"]` is true on the Fig 1 fixture.
8. **Health**: a trace whose `B == min_len` yields `boundary_equals_min_len`.
9. **Stage error capture**: monkeypatch one stage to raise; response has that stage `error`, later stages `skipped`, `status` still `ok` at envelope level.

### Frontend acceptance
- `npm run build` (or `tsc --noEmit`) passes with no new type errors.
- With the dev server and Python backend: select NetPlier/Modbus, open Pipeline Tracker, click Run:
  all 8 stage cards appear with statuses; clicking each shows its panel; `candidates` panel marks the true keyword
  `7/1`; `stage1` and `stage2` tables match the numbers printed by `debug_dataset.py` (same config) to 4 decimals.
- Message Tracker: pick a message, switch every lens, click byte 7: Byte Inspector shows rule rows including `sparse`;
  Candidate Path lists `7/1` with its value, cluster, and stage-1/2 numbers.
- Custom trace tab data (Fig 1): the pipeline view runs on the pasted text.
- A manual checklist in the final report: each acceptance item with pass/fail.

---

## 7. Work phases (stop after each and report)

**Phase A: inspect and plan (no code).** Report: where `run_pipeline` timers are, how `generate_candidates`
receives hits, what `ScoredCandidate.clusters` contains, how stage1.py computes p_r and p_s (paste the relevant lines),
which helper functions can be imported, and a list of any place where the spec cannot be met without changing algorithm
behavior. Wait for approval.

**Phase B: backend.** `PipelineCapture`, `pipeline.py` capture, `trace.py`, api commands, backend tests.
Report test output and the JSON of `pipeline_trace` for Modbus (netplier) saved to `tmp/pipeline_trace_modbus.json`
and `message_trace` for message 0 saved to `tmp/message_trace_modbus_0.json`.

**Phase C: frontend.** Types, hook, Header/App wiring, components. Report build output and screenshots or a
description of each stage panel and each lens.

**Phase D: polish.** Health checks wording, keyboard navigation, empty/error states, performance numbers for 100/500/1000 messages.

Final report must list every file changed/added and any deviation from this spec with the reason.
