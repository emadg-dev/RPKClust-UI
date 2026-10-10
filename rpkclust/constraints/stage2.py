"""
Stage 2: Self-Constraints Inference and Final Keyword Field Selection.
Calculates Bit-use constraint (p_bit), Position constraint (p_offset),
and final Bayesian combination probability P(K=1).
"""

from typing import List, Dict, Tuple, Optional, Any
import math
from rpkclust.model import Message, Candidate, ScoredCandidate, KeywordResult, Stage1Result
from rpkclust.config import Config
from rpkclust.constraints.posterior import combine_two_stage

def compute_bit_use_prob(
    values: List[bytes],
    endian: str = "big",
    dmax_mode: str = "max_over_m",
    prob_clip: Optional[Tuple[float, float]] = None
) -> Tuple[float, Dict[str, Any]]:
    """
    Compute Bit-use constraint probability p_bit according to Equations (7)-(10).
    R-14: dmax_mode controls D_max computation:
      - "max_over_m" (default): maximum over all bit positions m (current V2 approach)
      - "m_equals_msb": m = MSB (alternative reading of the paper)
    R-12: prob_clip controls clamping (default None = no clamp, only numeric guard).
    """
    if not values:
        return 0.50, {"msb": -1, "D": 0.0, "D_max": 0.0}

    distinct_bytes = list(set(values))
    int_vals = [int.from_bytes(v, byteorder=endian) for v in distinct_bytes if v]
    if not int_vals:
        return 0.50, {"msb": -1, "D": 0.0, "D_max": 0.0}

    msb_list = [(v.bit_length() - 1) for v in int_vals if v > 0]
    if not msb_list:
        return 0.50, {"msb": -1, "D": 0.0, "D_max": 0.0}

    max_msb = max(msb_list)
    total_valid = len(int_vals)

    q_k = []
    p_k = []

    for k in range(max_msb + 1):
        q_val = sum(1 for m in msb_list if m >= k) / total_valid
        p_val = 1.0 - math.exp2(-(max_msb + 1 - k))
        q_k.append(q_val)
        p_k.append(p_val)

    d_sq = sum((q - p) ** 2 for q, p in zip(q_k, p_k))
    D = math.sqrt(d_sq)

    d_max = 0.0
    if dmax_mode == "m_equals_msb":
        # Alternative reading: m = MSB, single D_max value
        m = max_msb
        d_m_sq = sum((1.0 - p_k[k]) ** 2 for k in range(m + 1)) + sum(p_k[k] ** 2 for k in range(m + 1, max_msb + 1))
        d_max = math.sqrt(d_m_sq)
    else:
        # Default: max over all possible m
        for m in range(max_msb + 1):
            d_m_sq = sum((1.0 - p_k[k]) ** 2 for k in range(m + 1)) + sum(p_k[k] ** 2 for k in range(m + 1, max_msb + 1))
            d_m = math.sqrt(d_m_sq)
            if d_m > d_max:
                d_max = d_m

    if d_max > 0:
        p_bit = 1.0 - (D / d_max)
    else:
        p_bit = 1.0

    if prob_clip is not None:
        p_bit = max(prob_clip[0], min(prob_clip[1], p_bit))
    else:
        p_bit = max(1e-12, min(1.0 - 1e-12, p_bit))

    details = {
        "msb": max_msb,
        "D": D,
        "D_max": d_max,
        "q_k": q_k,
        "p_k": p_k,
        "p_bit_raw": p_bit
    }

    return p_bit, details


def compute_position_prob(
    candidate: Candidate,
    config: Config,
    prob_clip: Optional[Tuple[float, float]] = None
) -> float:
    """
    Compute Position constraint probability p_offset (Equation 11):
    R-14: Position constraint depends on candidate type and offset.
    - If cand in FOR: max(0.95 - 0.01 * offset, 0.70)
    - If cand in NFOR: 0.60
    R-12: prob_clip controls clamping (default None = no clamp, only numeric guard).
    """
    if candidate.region == "FOR":
        base, slope, floor_val = config.pos_for
        p_off = max(base - slope * candidate.offset, floor_val)
    else:
        p_off = config.pos_nfor

    if prob_clip is not None:
        p_off = max(prob_clip[0], min(prob_clip[1], p_off))
    else:
        p_off = max(1e-12, min(1.0 - 1e-12, p_off))

    return p_off


def evaluate_stage2(
    messages: List[Message],
    stage1_result: Stage1Result,
    config: Config,
    direction: str = "c2s"
) -> KeywordResult:
    """
    Evaluate Stage 2 self-constraints on top-K candidates from Stage 1.
    Selects the winning candidate with highest posterior P(K=1).
    """
    target_msgs = [m for m in messages if m.direction == direction] if direction in ("c2s", "s2c") else messages
    if not target_msgs:
        target_msgs = messages

    if not stage1_result.top_k:
        # Fallback if no candidate available
        dummy = Candidate(region="FOR", offset=0, length=1, kind="window", direction=direction)
        return KeywordResult(
            direction=direction,
            candidate=dummy,
            posterior=0.5,
            p_bit=0.5,
            p_offset=0.5,
            p_f=0.5,
            ranking=[]
        )

    candidates_evaluated = []

    for cand in stage1_result.top_k:
        # Find scored candidate from stage 1
        s1_item = next((s for s in stage1_result.ranking if s.candidate == cand), None)
        p_f = s1_item.p_f if s1_item is not None else 0.50

        p_m = s1_item.p_m if s1_item is not None else 0.50
        p_r = s1_item.p_r if s1_item is not None else 0.50
        p_s = s1_item.p_s if s1_item is not None else 0.50
        p_d = s1_item.p_d if s1_item is not None else 0.50

        # Extract values for bit-use calculation
        values = [cand.extract(m) for m in target_msgs]
        valid_values = [v for v in values if v is not None]

        p_bit, bit_details = compute_bit_use_prob(valid_values, endian=config.bituse_endian, dmax_mode=config.dmax_mode, prob_clip=config.prob_clip)
        p_offset = compute_position_prob(cand, config, prob_clip=config.prob_clip)

        # R-12: pass prob_clip from config (default None = no clamp, only numeric guard)
        posterior = combine_two_stage(p_f=p_f, p_bit=p_bit, p_offset=p_offset, prob_clip=config.prob_clip)

        candidates_evaluated.append({
            "candidate": cand,
            "posterior": posterior,
            "p_f": p_f,
            "p_m": p_m,
            "p_r": p_r,
            "p_s": p_s,
            "p_d": p_d,
            "p_bit": p_bit,
            "p_offset": p_offset,
            "bit_details": bit_details,
        })

    # Sort by posterior descending
    # Tie-breaks: smaller offset, then shorter length
    candidates_evaluated.sort(
        key=lambda item: (
            item["posterior"],
            -item["candidate"].offset,
            -item["candidate"].length
        ),
        reverse=True
    )

    winner = candidates_evaluated[0]

    return KeywordResult(
        direction=direction,
        candidate=winner["candidate"],
        posterior=winner["posterior"],
        p_bit=winner["p_bit"],
        p_offset=winner["p_offset"],
        p_f=winner["p_f"],
        ranking=candidates_evaluated
    )
