# DECISIONS.md

This document tracks all design and mathematical decisions made for RPKClust where the paper left parameters or algorithms underspecified.

| ID | Decision | Reason |
|---|---|---|
| D-01 | Boundary B and candidates are computed per direction (client / server), with shared boundary scan option | NetPlier infers per side; headers may differ per direction. By default joint boundary is computed or per-direction. |
| D-02 | Candidate window lengths $L \in \{1, 2, 4\}$ | Paper says "variable sliding window", standard binary fields are 1, 2, or 4 bytes. |
| D-03 | No "dynamic expansion" in v1 (Alg. 1 only); provide hook `expand_boundary(b, M)` that returns b unchanged | "Boundary Dynamic Expansion" is shown in Figure 6 but never specified in the paper text. |
| D-04 | $t\_len \in \{1, 2\}$, $l\_len \in \{1, 2\}$, both big and little endian for TLV | Standard binary protocols use 1-byte or 2-byte type and length headers. |
| D-05 | Sub-byte (bit-level) keywords unsupported in v1 | Paper explicitly identifies this as a limitation (e.g. NTP 3-bit mode field). |
| D-06 | Stage-1 posterior computed in closed form (star factor graph) | NetPlier factor graph forms a star graph centered on latent keyword node $K$; marginalization is closed-form. |
| D-07 | Similarity and structure-coherence use alignment-free surrogates | The core thesis of RPKClust is avoiding global MSA. Similarity uses FOR positional match + NFOR sequence match; structure coherence uses length variance proxy. |
| D-08 | Add Length detector; exclude Length and Checksum from FOR candidates | Paper analysis explicitly mentions LEN was filtered by semantics, but section 3.3 omitted Length detector definition. |
| D-B1 | Bit-use MSB computation skips zero values | $v=0$ has no active bit; set bits start from 1. |
| D-B2 | $D_{max}$ re-derived from paper description | Paper Equation (9) has garbled bounds in text extraction. Re-derived from extreme case where empirical $Q$ is concentrated at bit position $m$. |
| D-B3 | Bit-use $Q(k)$ computed across multiset of message values | $Q(k)$ is defined as proportion of values in the field where $MSB \ge k$. |
| D-09 | Factor-graph constants $p_{arrow}$ / $p_{back}$ are hardcoded from NetPlier; `config.p_imp` removed | The paper (Sec. 3.6) states the factor graph is "similar to NetPlier" but gives no explicit values. V2's `config.p_imp` was unused; constants are now documented here: $p_{arrow} = \{sim:0.8, coupling:0.9, struct:0.9, dim:0.9\}$, $p_{back} = \{sim:0.8, coupling:0.8, struct:0.8, dim:0.7\}$. |
| D-10 | Boundary B is exclusive (first NFOR byte) | R-13: The paper is inconsistent (theorem says $B = \max(H)+1$, Fig. 7 draws boundary between 11 and 12, text calls keyword "offset 12"). V2 adopts the exclusive interpretation: $B = \max(\text{offset} + \text{length})$. For Figure 1, keyword at offset 12 → $B \ge 13$. |
| D-11 | Float and Length detectors excluded from boundary by default | R-05: The paper defines six boundary rules (Constant, Sequence, Timestamp, Sparse, Address, Checksum). Float and Length are used only in FOR candidate exclusion (Algorithm 2). Enable in boundary via `config.boundary_include_extra_rules=True`. |
| D-12 | NFOR candidate value is combined T-V (Type + Value) | R-01: Sec. 3.5 states "use T-V as the combined keyword field candidates". `Candidate.extract()` returns `type_bytes + value_bytes`, not just `value_bytes`. |
| D-13 | NFOR candidate stores `t_len` and `l_len` explicitly | R-02: The previous guessing heuristic (`1 if length <= 255 else 2`) was inconsistent with the TLV grid search. `Candidate` now stores `t_len: int = 1` and `l_len: int = 1` set at generation time. |
| D-14 | Cardinality pre-filter disabled by default | R-07: The heuristic `distinct/num_msgs > 0.5` is not in the paper. The dimensional constraint (Stage 1) handles this probabilistically. Enable via `config.candidate_max_distinct_ratio`. |
| D-15 | TLV grid search behind `tlv_auto_params` flag | R-08: Default uses fixed `(t_len=1, l_len=1, endian="big")` as in the paper. Grid search over `(1,2) × (1,2) × (big,little)` is enabled via `config.tlv_auto_params=True`. Presence/coverage filters also off by default in auto mode. |
| D-16 | Stage 1 normalization behind `stage1_normalize` flag | R-10: Min-max normalization across candidates is not in the paper (Eq. 14 treats each candidate's $p_f$ as an independent prior). Default `False`; enable via `config.stage1_normalize=True`. |
| D-17 | Probability clamping controlled by `prob_clip` config | R-12: Default is no clamp (only a $10^{-12}$ numeric guard). Hard clamps `[0.01, 0.99]` cause rank ties. Set `config.prob_clip = (lo, hi)` to restore clapping. |
| D-18 | D_max computation mode | R-14: Two interpretations of Eq. 9. V2 defaults to `dmax_mode = "max_over_m"` (max over all bit positions $m$). Alternative `m_equals_msb` sets $m = \text{MSB}$. |
| D-19 | Bit-use endianness controlled by config | R-15: Field values are converted to integers using `config.bituse_endian` (default `"big"`). MSB computed over the whole number. |
| D-20 | Checksum range: prefix `data[:offset]` | R-16: The paper does not define $D$ in Eq. 6. V2 uses the prefix before the checksum field as the default checksum data range. |
| D-21 | Cluster labels are per-direction by default | R-18: Ground truth is per-direction (client/server). Default `config.cluster_label_mode = "per_direction"`. Set to `"global"` for unified clustering across directions. |
| D-22 | `stage1_top_k` defaults to 5 | R-19: Paper Table 3 shows three ranks. Default 5 is within the {3, 4, 5} range documented in DECISIONS. |
