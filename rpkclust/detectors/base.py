"""
Base protocol and context for semantic detectors.
"""

from dataclasses import dataclass
from typing import List, Tuple, Optional, Any, Protocol
from rpkclust.model import Message, Hit, Pair
from rpkclust.config import Config

@dataclass
class Context:
    messages: List[Message]
    offset: int
    capture_range: Tuple[float, float]
    pairs: List[Pair]
    config: Config

class Detector(Protocol):
    name: str
    lengths: Tuple[int, ...]

    def check(self, slices: List[bytes], ctx: Context) -> Optional[Hit]:
        """Verify whether all message byte slices satisfy this semantic rule."""
        ...
