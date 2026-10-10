# revisions.md — Proposed changes to the V2 implementation

Baseline: current V2 implementation of RPKClust. Each item lists the current V2 status and the proposed change, with reference to the original specification.

Priorities: **P0** = direct contradiction, **P1** = significant deviation, **P2** = documentation improvement.

---

## A. Direct corrections

### R-01 (P0) — NFOR candidate must be the combined T-V
- **Current:** `Candidate.extract` returns only the Value bytes for NFOR (`m.data[off+t_len+l_len : ...+val_len]`).
- **Change:** the candidate value = `type_bytes + value_bytes` (tv_bytes). Clustering must also use this value.
- **Reference:** Sec. 3.5, "use T-V as the combined keyword field candidates".

### R-02 (P0) — Store t_len and l_len in `Candidate`
- **Current:** `Candidate` only has `endian`, and `extract` guesses `l_len` with `1 if length<=255 else 2`, which is inconsistent with the grid search over `l_len`.
- **Change:** add `t_len` and `l_len` fields to `Candidate` and make `extract` use only them. Remove the guessing rule.

### R-03 (P0) — Fix the B formula in the docs
- **Current:** `hit_end_offset = hit.offset + hit.length`, then `B = max(...) + 1` (one extra unit).
- **Change:** `hit_end_offset = offset + length − 1` and `B = max(hit_end_offset) + 1`, equivalent to `B = max(offset + length)`.
- **Reference:** Algorithm 1, lines 16–17 and 24.

### R-04 (P1) — Sparse detector: non-zero condition
- **Current:** only "≤ 2% of the value space" is documented.
- **Change:** state the `0 ∉ V_unique` condition (Eq. 4) explicitly in the docs and the implementation. For k=1 this means at most 5 unique values, for k=2 at most 1310.

### R-05 (P1) — Separate Float and Length from the boundary registry
- **Current:** both take part in `DEFAULT_RULES` and affect B.
- **Change:** restore the boundary registry to six rules: Constant, Sequence, Timestamp, Sparse, Address, Checksum. Use Float and Length only in the "exclude from FOR candidates" step (Algorithm 2). Add a flag `config.boundary_include_extra_rules` (default `False`) for experimental comparison.
- **Reference:** Sec. 3.3 (six rules) and Sec. 3.5 (FOR filter includes float).
- **Note:** if you keep Length in the boundary, record the reason and its measured effect on B in D-08.

### R-05b (P1) — Rule order
- **Change:** keep the order from Sec. 3.3 (Constant → Sequence → Timestamp → Sparse → Address → Checksum) and review V2's current order (which puts Sparse last). Order only affects first-match, not B, so this is low-risk but should be recorded explicitly.

### R-06 (P1) — Constant with arbitrary length
- **Current:** `lengths=(1,)`.
- **Change:** either restore lengths `(8,4,2,1)` or record in DECISIONS that equivalence with the single-byte version has been proven/tested. The specification says "byte slices of any length".

### R-07 (P1) — Remove the cardinality pre-filter or move it to an optional setting
- **Current:** drop a candidate if `distinct/num_msgs > 0.5` (for ≥10 messages).
- **Change:** disable by default (`candidate_max_distinct_ratio = None`). Keep only the `distinct ≤ 1` drop (consistent with Sec. 4.4 on TFTP). The dimensional constraint in Stage 1 already does this probabilistically; applying it twice is redundant.

### R-08 (P1) — Algorithm 3 with fixed parameters, grid search optional
- **Current:** grid over t_len∈{1,2}, l_len∈{1,2}, endian, selected by coverage 0.6 and presence 0.8.
- **Change:** default: a single `(t_len, l_len)` pair supplied by the user (as in the specification; default `(1,1)`, big-endian). Put the grid search behind `config.tlv_auto_params=False`. Presence and coverage filters off by default.
- **Reference:** Algorithm 3 (input: "TLV parameters (t_len, l_len)").

### R-09 (P1) — Document ValidateTLV and the B output (repeated boundaries)
- `ValidateTLV` is undefined in the specification; document the current rule (exact Value length match, no overflow) in PIPELINE.
- Algorithm 3 outputs `B` (boundaries of repeated TLV sequences); keep it in the V2 result as `repeated_boundaries` (even if unused in scoring).

### R-10 (P1) — Stage 1: drop min-max normalization by default
- **Current:** `raw_p_m, raw_p_r, raw_p_s` are normalized to [0.1, 0.95].
- **Change:** default: each constraint probability is computed independently of other candidates (since p_f is each candidate's prior, Eq. 14). Normalization only as optional `config.stage1_normalize=False`.
- **Side effect:** Stage 1 ranking no longer depends on the candidate set.

### R-11 (P1) — Clarify the factor-graph constants
- **Current:** `p_arrow`/`p_back` are hard-coded while `config.p_imp` is "unused".
- **Change:** remove one of the two. If the constants come from NetPlier, record the source and the original values in DECISIONS; the specification gives no numbers.
- **Reference:** Sec. 3.6, "similar to the factor graph used in NetPlier".

### R-12 (P1) — Unify clamps
- **Current:** Stage 1 in [0.01, 0.99], final combination in [0.001, 0.999], p_bit in [0.01, 0.99].
- **Change:** one central Config knob (`prob_clip`), defaulting to no clamp in the final combination (only a 1e‑12 numeric guard), and record its effect. Hard clamps cause rank ties.
- **Reference:** Eq. 15 (no clamp).

---

## B. Resolving specification ambiguities

### R-13 (P0) — Definitive definition of B (exclusive or inclusive)
- The specification is ambiguous about boundary interpretation.
- **Proposal:** keep B **exclusive** (first NFOR byte) and write this in DECISIONS. For the toy trace, since the keyword is at offset 12, the expected output is `B ≥ 13`. Document `test_fig1_pipeline` accordingly.
- **Action:** compute the boundary error under both interpretations to expose the difference.

### R-14 (P1) — Dmax in Eq. 9
- Two readings: (a) `m = MSB` (literal), (b) maximum over all m (current V2).
- **Proposal:** implement both as `config.dmax_mode ∈ {"max_over_m","m_equals_msb"}`, default `max_over_m`, and measure the effect on the rankings.
- Fix the D-B2 text: the equation is legible; the ambiguity is the definition of `m`.

### R-15 (P1) — bit-use for multi-byte fields
- Record in DECISIONS that field values are converted to integers using `bituse_endian` (default big) and MSB is computed over the whole number. The specification only gives a single-byte example.
- Zero values: dropped per D-B1; state the effect on `Q(k)` (denominator = number of non-zero values).

### R-16 (P1) — Checksum data range
- The specification does not define `D` in Eq. 6. Implement several modes (prefix `data[:offset]`, whole message minus the field, suffix) as `checksum_range_modes` and record which is the default in DECISIONS.

### R-17 (P1) — Message similarity without MSA
- Complete D-07 with the exact formula (FOR vs NFOR weighting, 64-byte window, sampling size). If EER is used, state the number of thresholds (101).
- State explicitly that the formula is a NetPlier-based substitute.

### R-18 (P1) — Cluster label and direction
- The specification does not say whether clusters are per direction. NetPlier-based GT is per direction.
- **Proposal:** `config.cluster_label_mode ∈ {"per_direction","global"}`; default matching the GT you use. Report both on the datasets, since this directly affects Completeness.

### R-19 (P2) — `top_k` in Stage 1
- The specification shows three ranks. Document the default between 3 and 5 and run a sensitivity analysis.

---

## C. Evaluation and tests

### R-20 (P1) — Align datasets and sizes
- Sizes: **100, 500, 1000 messages** (instead of [15, 30, 50, 75, 100]) for `scaling_benchmark`.
- Protocols: DNP3, Modbus, NTP, DHCP, TFTP, SMB, SMB2.
- BGP and HART IP are not in scope (removed from catalog).
- True keyword offsets: DNP3=12, Modbus=8, NTP=48, DHCP=240, TFTP=1, SMB=32, SMB2=64.

### R-21 (P1) — Metrics reported (besides h/c/v)
In addition to h/c/v, output:
- Time split into "boundary identification" and "keyword inference" (and peak memory).
- Boundary error: true offset, inferred offset, error and percentage. True values: DNP3=12, Modbus=8, NTP=48, DHCP=240, TFTP=1, SMB=32, SMB2=64.
- Keyword ranking and probabilities of the top three candidates per client/server.
- Number of candidates (specification baseline average 9.625).

### R-22 (P1) — Acceptance tests
- NTP should **fail** because its keyword is bit-level (expected h/c/v lower than byte-level protocols). This is the "correct" behavior, not a bug.
- The seven protocols at 1000 messages should rank the correct keyword first: DNP3→12, Modbus→7, DHCP→242, TFTP→(0:1), SMB→8, SMB2→(16:18).
- Target seven-protocol averages: 0.959 / 0.941 / 0.949 (set your own tolerance).

---

## D. Documentation-only fixes

| ID | Change |
|---|---|
| R-23 | Fix the bit-use description in V2-PIPELINE: significant bits typically sit at low positions and p_bit measures how close Q is to P (not "entropy vs flag/enum"). |
| R-24 | Add DECISIONS IDs for: Length/Float in the boundary, cardinality pre-filter, TLV grid search, presence/coverage filters, min-max, factor-graph constants, clamps, `top_k`, bit-use endianness, checksum range, cluster label. |
| R-25 | Fix doc errors: PCAPNG magic (`0a0d0d0a`), SPB block type (it is 3), dataset counts for sources other than netplier in the catalog, stray backtick in `direction_mode`. |
| R-26 | Evaluation reference values have known inconsistencies (SMB: small difference; TFTP with +1 error). Add a note when using them as test targets. |

---

## Suggested execution order
1. **R-13, R-03, R-01, R-02** (direct contradictions and the B ambiguity).
2. **R-05, R-07, R-08, R-10** (reduce structural deviations; via optional flags).
3. **R-14 to R-18** (formula ambiguities; implement both modes and record).
4. **R-20 to R-22** (evaluation and acceptance tests).
5. **R-23 to R-26** (documentation).
