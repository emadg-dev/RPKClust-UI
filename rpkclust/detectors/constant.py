"""
Constant Field Detector: Shannon entropy = 0, cross-message identical.
"""

from typing import List, Optional
from rpkclust.detectors.base import Context
from rpkclust.model import Hit

class ConstantDetector:
    name: str = "constant"
    lengths = (1,)  # Algorithm 1 tests byte-by-byte for constant

    def check(self, slices: List[bytes], ctx: Context) -> Optional[Hit]:
        if not slices:
            return None
        first = slices[0]
        # Conservative: all slices must be identical
        if all(s == first for s in slices):
            return Hit(
                rule=self.name,
                offset=ctx.offset,
                length=len(first),
                info={"value": first.hex(), "entropy": 0.0}
            )
        return None
