"""
Candidate generation module merging FOR and NFOR keyword candidate fields.
"""

from typing import List, Tuple, Dict, Any, Optional
from rpkclust.model import Message, Candidate, BoundaryResult, Hit
from rpkclust.config import Config
from rpkclust.candidates.for_region import generate_for_candidates
from rpkclust.candidates.nfor_tlv import generate_nfor_candidates

def generate_candidates(
    messages: List[Message],
    boundary: BoundaryResult,
    config: Optional[Config] = None,
    direction: str = "both"
) -> Tuple[List[Candidate], Dict[str, Any]]:
    """
    Generate and merge candidate keyword fields from FOR (Algorithm 2) and NFOR (Algorithm 3).
    Deduplicates candidates and caps pool at config.max_candidates.
    """
    if config is None:
        config = Config()

    for_cands, for_diag = generate_for_candidates(
        messages=messages,
        boundary_b=boundary.B,
        semantic_hits=boundary.hits,
        config=config,
        direction=direction
    )

    nfor_cands, nfor_diag = generate_nfor_candidates(
        messages=messages,
        boundary_b=boundary.B,
        config=config,
        direction=direction
    )

    # Merge and deduplicate
    merged: List[Candidate] = []
    seen_keys = set()

    for c in for_cands + nfor_cands:
        k = c.key()
        if k not in seen_keys:
            seen_keys.add(k)
            merged.append(c)

    # Sort primarily by offset, then by length
    merged.sort(key=lambda c: (c.offset, c.length))

    if len(merged) > config.max_candidates:
        merged = merged[:config.max_candidates]

    diagnostics = {
        "for_count": len(for_cands),
        "nfor_count": len(nfor_cands),
        "total_merged": len(merged),
        "for_diagnostics": for_diag,
        "nfor_diagnostics": nfor_diag,
    }

    return merged, diagnostics

__all__ = ["generate_candidates", "generate_for_candidates", "generate_nfor_candidates"]
