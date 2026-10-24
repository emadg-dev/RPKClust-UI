# rpkclust/boundary.py — Algorithm 1: FOR-NFOR Boundary Detection

## Line 1-4 docstring
"""FOR-NFOR Boundary Detection (Algorithm 1). Identifies the maximal boundary B between Fixed-Offset Region (FOR) and Non-Fixed-Offset Region (NFOR)."""

## Imports (lines 7-12)
- `logging` — module logger.
- `List, Optional` — typing.
- `Message, Pair, BoundaryResult, Hit` — frozen data models.
- `Config` — hyperparameters.
- `get_detectors` — detector factory honoring R-05.
- `Context` — per-offset evaluation context for detectors.

## logger (line 14)
Module-level logger `_module_`.

## expand_boundary (lines 16-21) — D-03 hook
- Signature: `expand_boundary(boundary: BoundaryResult, messages: List[Message]) -> BoundaryResult`
- Decision D-03: NOT implemented in v1. Returns `boundary` unchanged. Hook reserved for future "Boundary Dynamic Expansion" feature.

## find_boundary (lines 23-95) — main algorithm
Signature: `find_boundary(messages, config=None, pairs=None, direction="both") -> BoundaryResult`

### Step-by-step
1. **(23-38)** Empty input guard → returns `BoundaryResult(B=0, hits=[], min_len=0)`.
2. **(39-43)** Default config creation if None; default pairs empty list.
3. **(45-51)** Direction filtering — line 46: if `direction in ("c2s","s2c")` selects only `target_msgs` for that direction; else uses all messages. If the filter produced an empty list, falls back to full set.
4. **(52-56)** Compute `min_len`, `capture_range` (t_start, t_end) from target messages.
5. **(58)** `detectors = get_detectors(config)` — six boundary detectors or 8 if `boundary_include_extra_rules`.
6. **(59-60)** State: `hit_offsets` set; `hits_recorded` list.
7. **(62)** byte-by-byte loop `offset in range(min_len)`.
8. **(63-69)** Build `Context(messages=target_msgs, offset=offset, capture_range, pairs, config)`.
9. **(70)** `offset_hit = False` flag for first-match.
10. **(72-84)** Detector loop — **line 72:** outer loop over detectors in priority order (Constant→Sequence→Timestamp→Sparse→Address→Checksum). **Line 73:** inner loop over each `length` in `detector.lengths`. **Line 74:75** bounds check `offset + lr <= min_len`; build `slices = [m.data[offset:offset+lr] for m in target_msgs]` (one slice per message). **Line 77:** call `r.check(slices, ctx)`. **Line 78-81:** if `Hit` returned — `hit_offsets.add(offset + lr - 1)` records the **right boundary byte** (R-10: exclusive B = max + 1), append Hit, set flag True, break.
11. **(72-84)** First-match precedence enforced: once a detector/length matches, both inner length loop (break at 82 via `break` after setting flag) and outer rule loop (break at 84) terminate.
12. **(86-89)** Compute `B = max(hit_offsets) + 1` (exclusive first NFOR byte); if no hits, `B = 0`.
13. **(91-92)** Warning if `B == min_len` and min_len>0 — entire message is FOR.
14. **(94)** Construct `BoundaryResult(B, hits_recorded, min_len, direction)`.
15. **(95)** Apply `expand_boundary` hook (returns unchanged in v1).

## Key Decisions Referenced
- R-05: Float/Length excluded unless `boundary_include_extra_rules=True`.
- R-10: B exclusive.
- D-03: expand_boundary hook returns unchanged.
- R-06: multi-length ConstantDetector (8,4,2,1).

## Pipeline Integration
Called as Stage 1 in `pipeline.py` (`boundary` stage id). Its `B` feeds candidate generation and constraint evaluation.
