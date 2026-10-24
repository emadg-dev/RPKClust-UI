# rpkclust/constraints/posterior.py

## Star Factor Graph (Bayesian)

Observations: sim, coupling, struct, dim — each linked to latent K ∈ {0,1}.

### Fixed constants (R-11, D-09)
- `p_arrow = {"sim": 0.8, "coupling": 0.9, "struct": 0.9, "dim": 0.9}`
- `p_back = {"sim": 0.8, "coupling": 0.8, "struct": 0.8, "dim": 0.7}`

### compute_star_posterior(p_obs, p_arrow, p_back, prob_clip=None) -> float
- For each observation: compute g_1 (marginal likelihood K=1) and g_0 (K=0).
- Log-odds accumulation: `log_odds += ln(g_1 / g_0)` across all 4 observations.
- Sigmoid: `p_f = 1 / (1 + exp(-log_odds))`.
- R-12: Clamped to `[1e-12, 1-1e-12]` by default; hard clamp via `prob_clip=(lo,hi)` config.

### combine_two_stage(p_f, p_bit, p_offset, prob_clip=None) -> float
- `M = p_bit * p_offset * p_f` (support for K=1).
- `N = (1-p_bit) * (1-p_offset) * (1-p_f)` (support for K=0).
- `P(K=1) = M / (M + N)`.
- R-12: inputs clamped to `[1e-12, 1-1e-12]` by default; hard clamp via `prob_clip`.

## Notes
- D-06: Stage-1 posterior computed in closed form (star factor graph); marginalization is closed-form.
- D-09: p_arrow/p_back hardcoded from NetPlier; `config.p_imp` removed.
- D-17: prob_clip default None = no clamp, only 1e-12 numeric guard.