"""
Algorithm 2: Keyword Candidate Generation in FOR (Fixed-Offset Region).
Uses semantic exclusion and length-aligned sliding window.
"""

from typing import List, Set, Dict, Tuple, Any
from rpkclust.model import Message, Candidate, Hit
from rpkclust.config import Config


def is_continuous(valid_set: Set[int], start: int, length: int) -> bool:
    """Validate that every byte in [start, start + length - 1] is in valid_set."""
    return all((start + i) in valid_set for i in range(length))


def generate_for_candidates(
    messages: List[Message],
    boundary_b: int,
    semantic_hits: List[Hit],
    config: Config,
    direction: str = "both"
) -> Tuple[List[Candidate], Dict[str, Any]]:
    if boundary_b <= 0 or not messages:
        return [], {"excluded_bytes": [], "sparse_bytes": [], "available_S": [],
                    "exclusion_reasons": {}}

    target_msgs = [m for m in messages if m.direction == direction] if direction in ("c2s", "s2c") else messages
    if not target_msgs:
        target_msgs = messages

    excluded_bytes: Set[int] = set()
    sparse_bytes: Set[int] = set()
    checksum_bytes: Set[int] = set()
    exclusion_reasons: Dict[int, List[str]] = {}
    exclude_rules = set(config.for_exclude_rules)

    for h in semantic_hits:
        h_start = h.offset
        h_end = min(h.offset + h.length, boundary_b)
        if h_start >= boundary_b:
            continue

        if h.rule == "checksum":
            # NOT in the paper: a checksum byte must never become a keyword,
            # even if the same bytes were also tagged sparse.
            checksum_bytes.update(range(h_start, h_end))
        if h.rule == "sparse":
            sparse_bytes.update(range(h_start, h_end))
        elif h.rule in exclude_rules:
            for b_idx in range(h_start, h_end):
                excluded_bytes.add(b_idx)
                exclusion_reasons.setdefault(b_idx, []).append(h.rule)

    # Line 3: E = E_sem \ F_sparse  (checksum bytes stay excluded: deviation)
    effective_excluded = (excluded_bytes - sparse_bytes) | checksum_bytes

    # Line 4: U = [0, B-1] \ E
    all_for_bytes = set(range(boundary_b))
    U = all_for_bytes - effective_excluded

    # Line 5: S = U ∪ F_sparse  (minus checksum bytes)
    S = U | (sparse_bytes - checksum_bytes)

    candidates: List[Candidate] = []
    num_msgs = len(target_msgs)

    for L in config.fo_lengths_for_candidates:
        for s in sorted(S):
            if s + L > boundary_b:
                continue
            if s % L != 0:
                continue
            if L > 1 and not is_continuous(S, s, L):
                continue

            values = [m.data[s:s + L] for m in target_msgs if len(m.data) >= s + L]
            if len(values) != num_msgs:
                continue
            distinct_cnt = len(set(values))
            if distinct_cnt <= 1:      # not in paper: drops constant sparse bytes
                continue
            max_ratio = config.candidate_max_distinct_ratio
            if max_ratio is not None and num_msgs >= 10 and distinct_cnt / num_msgs > max_ratio:
                continue

            candidates.append(Candidate(region="FOR", offset=s, length=L,
                                        kind="window", direction=direction))

    diagnostics = {
        "boundary_b": boundary_b,
        "excluded_bytes": sorted(effective_excluded),
        "sparse_bytes": sorted(sparse_bytes),
        "available_S": sorted(S),
        "exclusion_reasons": {k: list(set(v)) for k, v in exclusion_reasons.items()},
    }
    return candidates, diagnostics