# rpkclust/constraints/stage1.py

## Stage 1: Four Clustering Constraints

### compute_pairwise_similarity(msg_a, msg_b, boundary_b) -> float
Alignment-free similarity (D-07):
- FOR region positional exact match: `for_len = min(boundary_b, min(len_a, len_b))`; count byte-by-byte matches.
- NFOR region sequence matching: `difflib.SequenceMatcher(None, nfor_a, nfor_b, autojunk=False)` on first 64 bytes of NFOR.
- `total_matches = for_matches + nfor_matches`.
- `denom = for_len*2 + len(nfor_a) + len(nfor_b)`.
- `return min(1.0, (2.0 * total_matches) / denom)`.

### compute_eer(inner_scores, inter_scores) -> float
- Sweeps 101 thresholds (0.00-1.00).
- For each threshold: `fmr = count(inter_scores >= t) / n_inter`; `fnmr = count(inner_scores < t) / n_inner`.
- `diff = abs(fmr - fnmr)`.
- Returns threshold minimizing |FMR-FNMR|, returns average.
- Returns 0.90 for degenerate inputs.

### evaluate_stage1(messages, candidates, boundary_b, config, pairs, direction) -> Stage1Result

For each candidate:
1. Cluster messages by extracted value (via `Candidate.extract()`).
2. If ≤1 distinct non-null value → skip with raw scores 0.01, p_d=0.01.
3. **Similarity (p_m):** EER between intra-cluster and inter-cluster pairwise similarities. `raw_p_m = 1 - EER`.
4. **Remote Coupling (p_r):** Requires ≥30% paired messages (`pair_min_ratio=0.3`). Measure intra-type similarity of response messages across pairs. If insufficient pairs → 0.50 (neutral).
5. **Structure Consistency (p_s):** Length variance within each cluster. `c_ps = 1 - mean(|l - median|) / max(l)`. Singletons penalized (0.10).
6. **Dimension (p_d):** If `r_distinct ≤ 0.5` AND `r_single < 0.5` → `p_d = 0.95`; else hard penalty `0.01` (suppresses other scores to 0.20).

### Normalization (R-10, D-16)
- Off by default (`stage1_normalize=False`).
- When on: min-max normalize `p_m`, `p_r`, `p_s` into `[0.1, 0.95]` (or `0.50` if uniform).

### Star posterior
- `p_obs = {"sim": p_m, "coupling": p_r, "struct": p_s, "dim": p_d}`.
- `p_f = compute_star_posterior(p_obs, p_arrow, p_back, prob_clip=config.prob_clip)`.

### Output
- `Stage1Result.ranking` (list of `ScoredCandidate` sorted by `p_f` descending).
- `top_k` (top K candidates, default 5).