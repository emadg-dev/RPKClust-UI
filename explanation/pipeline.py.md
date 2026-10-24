# rpkclust/pipeline.py — Pipeline Orchestration

## Lines 1-5 docstring
"""End-to-end RPKClust pipeline execution. Wires together preprocessing, boundary detection, candidate generation, two-stage inference, and clustering."""

## Imports (7-20)
`time`, `os`, `json`, `traceback`, typing; BOUNDARY_RULES; model classes; Config; `find_boundary`; `generate_candidates`; `evaluate_stage1`; `evaluate_stage2`; `cluster_messages`; `evaluate_clusters_against_messages`.

## STAGE_IDS (line 23)
["boundary", "tagging", "candidates", "stage1", "stage2", "cluster", "metrics"]. Note: "tagging" stage is an implementation addition — collects ALL semantic tags for candidate filtering while B comes from first-match boundary scan.

## run_pipeline (lines 26-270)
Signature: `run_pipeline(trace_or_messages, config=None, output_dir=None, capture=False) -> Result`.

### Input normalization (46-58)
- If `Trace`: unpack messages, pairs, capture_range.
- If `list`: messages list; build empty pairs; capture_range min/max ts.
- Else raise ValueError.

### run_stage helper (63-76)
Records timing per stage id; catches exceptions if `capture=True` → records error string, returns None (skips downstream); if `capture=False` exceptions propagate unchanged.

### Stage 1: boundary detection (78-81)
`boundary = find_boundary(messages=messages, config=config, pairs=pairs)`.

### Stage 2: tagging + candidates (83-109)
- `all_hits(messages, config, max_offset=boundary.B, pairs=pairs, detectors=BOUNDARY_RULES + EXTRA_RULES)` — collect all tags within [0,B).
- Build `cand_boundary` BoundaryResult with tag_hits.
- `generate_candidates(...)` → `(candidates, cand_diagnostics)`.
- Cap handled inside generator at `max_candidates` default 64.

### Stage 3: two-stage inference per direction (112-144)
- `directions_to_run = ["c2s","s2c"]`; fallback to ["both"] if neither direction present.
- For each direction: `evaluate_stage1(...)` then `evaluate_stage2(...)`.
- Break on None stage result; `inference_complete` set only if all directions complete without break.

### Stage 4: clustering + metrics (145-152)
- `cluster_messages(messages, keywords)` → Dict[int,str].
- `evaluate_clusters_against_messages(...)` → (h,c,v).

### Diagnostics (159-184)
- `timing`: total + per-stage seconds (combined candidates view + candidates_gen_sec separate).
- `boundary_b`, `min_len`, `hits_count`, `candidates_count`, `metrics` (h/c/v), `cand_diagnostics`, `directions`.

### PipelineCapture (186-203)
If `capture=True`: `PipelineCapture(...)` assembled.

### Result construction (205-212)
`Result(boundary=..., candidates=..., keywords=..., clusters=..., diagnostics=..., trace=capture_obj)`.

### JSON export (215-268)
If `output_dir`:
- `03_boundary.json` — B, min_len, hits list.
- `04_candidates.json` — candidates list (region/offset/length/kind/tlv_type hex).
- `keywords.json` — per direction: offset/length/region/posterior/p_bit/p_offset/p_f + ranking entries.
- `clusters.json` — clusters dict.

### Return
Returns `result`.

## Integration
- Called by `api_runner.py` (`run_pipeline` / `run_pipeline(trace, config, capture=True)`).
- Called by `cli.py` (`run_pipeline(trace, cfg, output_dir=args.out)`).
- Used by `eval/ground_truth.py`.

## Caveats
- `keywords` dict may have None entries per direction.
- `boundary` may be None when capture=True and stage failed; type:ignore comment handles that.