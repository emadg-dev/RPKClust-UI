"""
Detector registry and all_hits scanning mechanism.
"""

from typing import List, Optional, Tuple
from rpkclust.detectors.base import Detector, Context
from rpkclust.detectors.constant import ConstantDetector
from rpkclust.detectors.sequence import SequenceDetector
from rpkclust.detectors.timestamp import TimestampDetector
from rpkclust.detectors.sparse import SparseDetector
from rpkclust.detectors.checksum import ChecksumDetector
from rpkclust.detectors.address import AddressDetector
from rpkclust.detectors.float_rule import FloatDetector
from rpkclust.detectors.length_rule import LengthDetector
from rpkclust.model import Message, Hit, Pair
from rpkclust.config import Config

# R-05b: Paper order (Sec. 3.3): Constant -> Sequence -> Timestamp -> Sparse -> Address -> Checksum
BOUNDARY_RULES: List[Detector] = [
    ConstantDetector(),
    SequenceDetector(),
    TimestampDetector(),
    SparseDetector(),
    AddressDetector(),
    ChecksumDetector(),
]

# Extra rules not in the boundary algorithm but used for FOR exclusion (R-05)
EXTRA_RULES: List[Detector] = [
    FloatDetector(),
    LengthDetector(),
]

DEFAULT_RULES: List[Detector] = BOUNDARY_RULES + EXTRA_RULES

def get_detectors(config: Optional[Config] = None) -> List[Detector]:
    """
    Return ordered list of detectors for boundary scanning.
    R-05: By default, only 6 rules are used for boundary detection.
    Float and Length are included only when config.boundary_include_extra_rules=True.
    """
    if config is None:
        config = Config()
    if config.boundary_include_extra_rules:
        return DEFAULT_RULES
    return BOUNDARY_RULES

def all_hits(
    messages: List[Message],
    config: Optional[Config] = None,
    max_offset: Optional[int] = None,
    pairs: Optional[List[Pair]] = None,
    detectors: Optional[List[Detector]] = None
) -> List[Hit]:
    """
    Scan all message fragments across offsets and evaluate all semantic rules.
    Returns all hits found in the messages.
    """
    if not messages:
        return []

    if config is None:
        config = Config()

    if pairs is None:
        pairs = []
        
    detectors = detectors if detectors is not None else get_detectors(config)

    min_len = min(len(m.data) for m in messages)
    limit = min_len if max_offset is None else min(min_len, max_offset)

    t_start = min((m.ts for m in messages), default=0.0)
    t_end = max((m.ts for m in messages), default=0.0)
    capture_range = (t_start, t_end)

    detectors = get_detectors(config)
    hits: List[Hit] = []

    for offset in range(limit):
        ctx = Context(
            messages=messages,
            offset=offset,
            capture_range=capture_range,
            pairs=pairs,
            config=config,
        )
        for d in detectors:
            for l in d.lengths:
                if offset + l <= min_len:
                    slices = [m.data[offset:offset + l] for m in messages]
                    hit = d.check(slices, ctx)
                    if hit is not None:
                        hits.append(hit)

    return hits
