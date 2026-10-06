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

DEFAULT_RULES = [
    ConstantDetector(),
    SequenceDetector(),
    TimestampDetector(),
    FloatDetector(),
    LengthDetector(),
    ChecksumDetector(),
    AddressDetector(),
    SparseDetector(),
]

def get_detectors(config: Optional[Config] = None) -> List[Detector]:
    """Return ordered list of detectors according to configuration."""
    return DEFAULT_RULES

def all_hits(
    messages: List[Message],
    config: Optional[Config] = None,
    max_offset: Optional[int] = None,
    pairs: Optional[List[Pair]] = None
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
