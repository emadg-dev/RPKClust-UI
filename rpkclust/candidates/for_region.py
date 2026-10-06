"""
Algorithm 2: Keyword Candidate Generation in FOR (Fixed-Offset Region).
Uses semantic exclusion and length-aligned sliding window.
"""

from typing import List, Set, Dict, Tuple
from rpkclust.model import Message, Candidate, Hit
from rpkclust.config import Config

def is_continuous(valid_set: Set[int], start: int, length: int) -> bool:
    """Validate that every byte in interval [start, start + length - 1] is in valid_set."""
    return all((start + i) in valid_set for i in range(length))

def generate_for_candidates(
    messages: List[Message],
    boundary_b: int,
    semantic_hits: List[Hit],
    config: Config,
    direction: str = "both"
) -> Tuple[List[Candidate], Dict[str, any]]:
    """
    Algorithm 2: Keyword Candidate Generation in FOR.
    Returns generated candidates and explanation diagnostics.
    """
    if boundary_b <= 0 or not messages:
        return [], {"excluded_offsets": {}, "S": []}

    target_msgs = [m for m in messages if m.direction == direction] if direction in ("c2s", "s2c") else messages
    if not target_msgs:
        target_msgs = messages

    # Byte-level tagging of semantic regions in FOR [0, boundary_b - 1]
    excluded_bytes: Set[int] = set()
    sparse_bytes: Set[int] = set()
    exclusion_reasons: Dict[int, List[str]] = {}

    exclude_rules = set(config.for_exclude_rules)

    for h in semantic_hits:
        h_start = h.offset
        h_end = min(h.offset + h.length, boundary_b)
        if h_start >= boundary_b:
            continue

        if h.rule == "sparse":
            for b_idx in range(h_start, h_end):
                sparse_bytes.add(b_idx)
        elif h.rule in exclude_rules:
            for b_idx in range(h_start, h_end):
                excluded_bytes.add(b_idx)
                exclusion_reasons.setdefault(b_idx, []).append(h.rule)

    # Line 3: E = E_sem \ F_sparse
    # (If a byte was tagged sparse, it is not excluded)
    effective_excluded = excluded_bytes - sparse_bytes

    # Line 4: U = [0, B - 1] \ E
    all_for_bytes = set(range(boundary_b))
    U = all_for_bytes - effective_excluded

    # Line 5: S = U U F_sparse
    S = U.union(sparse_bytes)

    candidates: List[Candidate] = []
    num_msgs = len(target_msgs)

    # Lines 7-13: Iterate over lengths L and starting points s in S
    for L in config.fo_lengths_for_candidates:
        for s in sorted(S):
            if s + L > boundary_b:
                continue

            # Line 8: Modulo alignment check s == 0 (mod L)
            if s % L == 0:
                # Line 9: Continuity check
                if L == 1 or is_continuous(S, s, L):
                    # Check cardinality pre-filters
                    values = [m.data[s:s + L] for m in target_msgs if len(m.data) >= s + L]
                    if len(values) == num_msgs:
                        distinct_cnt = len(set(values))
                        # Drop constant candidate (1 unique value)
                        if distinct_cnt <= 1:
                            continue
                        # Drop if distinct ratio > 0.5 (dimension pre-filter)
                        if num_msgs >= 10 and (distinct_cnt / num_msgs > 0.5):
                            continue

                        cand = Candidate(
                            region="FOR",
                            offset=s,
                            length=L,
                            kind="window",
                            direction=direction,
                        )
                        candidates.append(cand)

    diagnostics = {
        "boundary_b": boundary_b,
        "excluded_bytes": sorted(effective_excluded),
        "sparse_bytes": sorted(sparse_bytes),
        "available_S": sorted(S),
        "exclusion_reasons": {k: list(set(v)) for k, v in exclusion_reasons.items()},
    }

    return candidates, diagnostics
