"""
Closed-form probabilistic factor graph marginalization for Stage 1 and Stage 2.
"""

import math
from typing import Dict, List, Tuple

def compute_star_posterior(
    p_obs: Dict[str, float],
    p_arrow: Dict[str, float],
    p_back: Dict[str, float]
) -> float:
    """
    Exact closed-form marginalization of the star factor graph centered on latent keyword variable K in {0, 1}.
    Each observation x_i in {0, 1} has:
      f_obs(x) = p_x if x else (1 - p_x)
      f_fwd(k, x) = p_arrow if (not k or x) else (1 - p_arrow)
      f_bwd(k, x) = p_back if (k or not x) else (1 - p_back)
    Computes log-odds sum and returns P(K = 1).
    """
    log_odds = 0.0

    for name, p_val in p_obs.items():
        arr = p_arrow.get(name, 0.9)
        bck = p_back.get(name, 0.8)

        # Clamp observation prior to avoid 0 or 1
        p_val = max(0.01, min(0.99, p_val))

        # g_x(k) = sum_{x in {0, 1}} f_obs(x) * f_fwd(k, x) * f_bwd(k, x)
        # For x = 1:
        #   f_obs(1) = p_val
        #   f_fwd(1, 1) = arr;       f_bwd(1, 1) = bck
        #   f_fwd(0, 1) = arr;       f_bwd(0, 1) = 1 - bck
        # For x = 0:
        #   f_obs(0) = 1 - p_val
        #   f_fwd(1, 0) = 1 - arr;   f_bwd(1, 0) = bck
        #   f_fwd(0, 0) = arr;       f_bwd(0, 0) = bck

        g_1 = p_val * arr * bck + (1.0 - p_val) * (1.0 - arr) * bck
        g_0 = p_val * arr * (1.0 - bck) + (1.0 - p_val) * arr * bck

        if g_1 > 0 and g_0 > 0:
            log_odds += math.log(g_1) - math.log(g_0)

    # Sigmoid function for posterior
    # p_f = 1 / (1 + exp(-log_odds))
    try:
        p_f = 1.0 / (1.0 + math.exp(-log_odds))
    except OverflowError:
        p_f = 1.0 if log_odds > 0 else 0.0

    return max(0.01, min(0.99, p_f))


def combine_two_stage(
    p_f: float,
    p_bit: float,
    p_offset: float
) -> float:
    """
    Equation (14)-(15) from paper:
    M = p_bit * p_offset * p_f
    N = (1 - p_bit) * (1 - p_offset) * (1 - p_f)
    P(K = 1 | p_bit, p_offset) = M / (M + N)
    """
    # Clamp to [0.001, 0.999] to prevent 0 / 0
    pf_c = max(0.001, min(0.999, p_f))
    pb_c = max(0.001, min(0.999, p_bit))
    po_c = max(0.001, min(0.999, p_offset))

    M = pb_c * po_c * pf_c
    N = (1.0 - pb_c) * (1.0 - po_c) * (1.0 - pf_c)

    if M + N == 0:
        return 0.5

    return M / (M + N)
