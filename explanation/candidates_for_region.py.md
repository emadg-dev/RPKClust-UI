# rpkclust/candidates/for_region.py

## Input: messages, boundary_b, semantic_hits (from Stage 1)

1. **Semantic byte tagging (lines 249-255):**
   - For each Hit in `[hit.offset, min(hit.offset + hit.length, B))`:
     - If rule == "sparse" → add to `sparse_bytes` (rescued from exclusion).
     - If rule in `config.for_exclude_rules` → add to `excluded_bytes` with reason.
   - Effective excluded = `excluded_bytes - sparse_bytes`.
   - Available set `S = {0..B-1} - effective_excluded` ∪ `sparse_bytes`.

2. **Candidate generation (lines 257-261):**
   - For each `L` in `config.fo_lengths_for_candidates` (default `(1,2,4)`):
     - For each `s` in sorted `S`:
       - **Modulo alignment:** `s % L == 0`.
       - **Continuity:** `is_continuous(S, s, L)` — all bytes `[s, s+L-1]` ∈ `S`.
       - **Cardinality pre-filter (R-07, opt-in):** if `config.candidate_max_distinct_ratio` set, require `distinct_count / num_msgs ≤ ratio`.

## Notes
- Sparse bytes are rescued from exclusion (D-B1).
- Effective excluded set excludes sparse bytes (D-05).
- Modulo alignment ensures byte alignment.
- Continuity ensures contiguous byte range in `S`.
- R-07 is opt-in via `config.candidate_max_distinct_ratio`.