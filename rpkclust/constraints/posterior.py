"""
Closed-form probabilistic factor graph marginalization for Stage 1 and Stage 2.
"""

import math
from typing import Dict, List, Tuple, Optional

def compute_star_posterior(
    p_obs: Dict[str, float],
    p_arrow: Dict[str, float],
    p_back: Dict[str, float],
    prob_clip: Optional[Tuple[float, float]] = None
) -> float:
    """
    Exact closed-form marginalization of the star factor graph centered on latent keyword variable K in {0, 1}.
    Each observation x_i in {0, 1} has:
      f_obs(x) = p_x if x else (1 - p_x)
      f_fwd(k, x) = p_arrow if (not k or x) else (1 - p_arrow)
      f_bwd(k, x) = p_back if (k or not x) else (1 - p_back)
    Computes log-odds sum and returns P(K = 1).

    R-12: Hard clamps cause rank ties. By default, only a 1e-12 numeric guard
    is applied. Set prob_clip=(lo, hi) to restore clamping.
    """
    log_odds = 0.0

    for name, p_val in p_obs.items():
        arr = p_arrow.get(name, 0.9)
        bck = p_back.get(name, 0.8)

        # R-12: numeric guard only (no hard clamp by default)
        p_val = max(1e-12, min(1.0 - 1e-12, p_val))

        g_1 = p_val * arr * bck + (1.0 - p_val) * (1.0 - arr) * bck
        g_0 = p_val * arr * (1.0 - bck) + (1.0 - p_val) * arr * bck

        if g_1 > 0 and g_0 > 0:
            log_odds += math.log(g_1) - math.log(g_0)

    try:
        p_f = 1.0 / (1.0 + math.exp(-log_odds))
    except OverflowError:
        p_f = 1.0 if log_odds > 0 else 0.0

    if prob_clip is not None:
        p_f = max(prob_clip[0], min(prob_clip[1], p_f))

    return p_f


def combine_two_stage(
    p_f: float,
    p_bit: float,
    p_offset: float,
    prob_clip: Optional[Tuple[float, float]] = None
) -> float:
    """
    Equation (14)-(15):
    M = p_bit * p_offset * p_f
    N = (1 - p_bit) * (1 - p_offset) * (1 - p_f)
    P(K = 1 | p_bit, p_offset) = M / (M + N)

    R-12: By default, only a 1e-12 numeric guard is applied (no hard clamp).
    Set prob_clip=(lo, hi) to restore clamping.
    """
    pf_c = max(1e-12, min(1.0 - 1e-12, p_f))
    pb_c = max(1e-12, min(1.0 - 1e-12, p_bit))
    po_c = max(1e-12, min(1.0 - 1e-12, p_offset))

    if prob_clip is not None:
        pf_c = max(prob_clip[0], min(prob_clip[1], pf_c))
        pb_c = max(prob_clip[0], min(prob_clip[1], pb_c))
        po_c = max(prob_clip[0], min(prob_clip[1], po_c))

    M = pb_c * po_c * pf_c
    N = (1.0 - pb_c) * (1.0 - po_c) * (1.0 - pf_c)

    if M + N == 0:
        return 0.5

    result = M / (M + N)

    if prob_clip is not None:
        result = max(prob_clip[0], min(prob_clip[1], result))

    return result
