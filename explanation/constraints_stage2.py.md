# rpkclust/constraints/stage2.py

## Stage 2: Self-Constraints & Final Keyword Selection

### compute_bit_use_prob(values, endian, dmax_mode, prob_clip) -> Tuple[float, Dict]
- **Input:** list of bytes values (extracted from messages).
- **Step 1:** Convert bytes to integers via `int.from_bytes(v, byteorder=endian)`.
- **Step 2:** Filter zero values (D-B1): `v=0` has no active bit.
- **Step 3:** Compute MSB list: `msb_list = [v.bit_length() - 1 for v in nonzero]`.
- **Step 4:** `Q(k)`: empirical MSB distribution — proportion of values where `MSB ≥ k`.
- **Step 5:** `P(k)`: theoretical uniform — `1 - 1/2^(max_msb+1-k)`.
- **Step 6:** Euclidean distance `D = sqrt(sum((Q-P)²))`.
- **Step 7:** D_max: max over all possible m (default `dmax_mode="max_over_m"`), or single value at `m=MSB` (`m_equals_msb`).
- **Result:** `p_bit = 1 - D/D_max`.
- **Clipping:** If `prob_clip` set → clamp to interval; else clamp to `[1e-12, 1-1e-12]`.

### compute_position_prob(candidate, config, prob_clip) -> float
- FOR: `p_offset = max(base - slope * offset, floor)` where `pos_for = (0.95, 0.01, 0.70)`.
- NFOR: Fixed `0.60` (`pos_nfor=0.60`).
- Clipping same as `p_bit`.

### evaluate_stage2(messages, stage1_result, config, direction) -> KeywordResult
For each top-K candidate from Stage 1 (`stage1_top_k=5`):
1. Get `p_f`, `p_m`, `p_r`, `p_s`, `p_d` from matching Stage 1 scored candidate.
2. Extract valid values `cand.extract(m)` for all messages in direction.
3. Compute `p_bit` via `compute_bit_use_prob`.
4. Compute `p_offset` via `compute_position_prob`.
5. Compute `posterior = combine_two_stage(p_f, p_bit, p_offset, prob_clip=config.prob_clip)`.

### Two-stage combination (lines 296-300 in posterior.py)
- `M = p_bit * p_offset * p_f`.
- `N = (1-p_bit) * (1-p_offset) * (1-p_f)`.
- `P(K=1) = M / (M + N)`.

### Output
- `KeywordResult` with highest-posterior candidate.
- Ranking sorted by posterior descending (tie-break: smaller offset, then shorter length).

## Notes
- R-14: D_max mode configurable.
- R-15: bit-use endianness configurable (`bituse_endian`).
- R-18: cluster labels per-direction (`cluster_label_mode`).
- D-19: bit-use endianness by config.
- D-20: position factor formula (Eq. 11).