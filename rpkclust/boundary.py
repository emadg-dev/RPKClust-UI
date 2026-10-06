"""
FOR-NFOR Boundary Detection (Algorithm 1 in RPKClust paper).
Identifies the maximal boundary B between Fixed-Offset Region (FOR)
and Non-Fixed-Offset Region (NFOR).
"""

import logging
from typing import List, Optional
from rpkclust.model import Message, Pair, BoundaryResult, Hit
from rpkclust.config import Config
from rpkclust.detectors.registry import get_detectors
from rpkclust.detectors.base import Context

logger = logging.getLogger(__name__)

def expand_boundary(boundary: BoundaryResult, messages: List[Message]) -> BoundaryResult:
    """
    Hook for boundary dynamic expansion (referenced in Figure 6 of paper).
    Returns boundary unchanged in v1 (Decision D-03).
    """
    return boundary

def find_boundary(
    messages: List[Message],
    config: Optional[Config] = None,
    pairs: Optional[List[Pair]] = None,
    direction: str = "both"
) -> BoundaryResult:
    """
    Algorithm 1: FOR-NFOR Boundary Detection.
    Scans every byte offset 0 .. min_len - 1 using explicit semantic detectors.
    Computes maximal boundary B = max(hit_offsets) + 1.
    """
    if not messages:
        return BoundaryResult(B=0, hits=[], min_len=0, direction=direction)

    if config is None:
        config = Config()

    if pairs is None:
        pairs = []

    # Filter messages if direction specified
    if direction in ("c2s", "s2c"):
        target_msgs = [m for m in messages if m.direction == direction]
        if not target_msgs:
            target_msgs = messages
    else:
        target_msgs = messages

    min_len = min(len(m.data) for m in target_msgs)
    t_start = min((m.ts for m in target_msgs), default=0.0)
    t_end = max((m.ts for m in target_msgs), default=0.0)
    capture_range = (t_start, t_end)

    detectors = get_detectors(config)
    hit_offsets = set()
    hits_recorded: List[Hit] = []

    for offset in range(min_len):
        ctx = Context(
            messages=target_msgs,
            offset=offset,
            capture_range=capture_range,
            pairs=pairs,
            config=config
        )
        offset_hit = False

        for r in detectors:
            for lr in r.lengths:
                if offset + lr <= min_len:
                    slices = [m.data[offset:offset + lr] for m in target_msgs]
                    res = r.check(slices, ctx)
                    if res is not None:
                        # Match successful: record right boundary (offset + lr - 1)
                        hit_offsets.add(offset + lr - 1)
                        hits_recorded.append(res)
                        offset_hit = True
                        break  # Terminate length loop for this rule
            if offset_hit:
                break  # Terminate rule loop: enforce first-match precedence at this offset

    if hit_offsets:
        B = max(hit_offsets) + 1
    else:
        B = 0

    if B == min_len and min_len > 0:
        logger.warning("Inferred boundary B (%d) equals min_len (%d). Entire message is FOR.", B, min_len)

    result = BoundaryResult(B=B, hits=hits_recorded, min_len=min_len, direction=direction)
    return expand_boundary(result, target_msgs)
