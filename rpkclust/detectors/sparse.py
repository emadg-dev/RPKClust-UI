"""
Sparse Value Detector: identifies low-entropy, underutilized non-zero fields (e.g. flags, opcodes).
Formula: |V_unique| / 2^(8k) <= 0.02 and 0 not in V_unique.
"""

from typing import List, Optional
from rpkclust.detectors.base import Context
from rpkclust.model import Hit

class SparseDetector:
    name: str = "sparse"
    lengths = (1, 2)

    def check(self, slices: List[bytes], ctx: Context) -> Optional[Hit]:
        if not slices:
            return None

        k = len(slices[0])
        unique_vals = set(slices)
        zero_bytes = b"\x00" * k

        # 0 must not be in unique values
        if zero_bytes in unique_vals:
            return None

        max_possible = 2 ** (8 * k)
        ratio = len(unique_vals) / max_possible

        # For k=1: max 5 values (256 * 0.02 = 5.12)
        if k == 1 and len(unique_vals) > 5:
            return None

        # For k=2: in finite packet traces (e.g. N=100), sparse fields are opcodes/status flags with <= 10 values
        # Fields with many distinct values (e.g. 50 distinct IDs) are transaction IDs / entropy, not sparse.
        if k == 2 and (len(unique_vals) > 10 or len(unique_vals) > 0.15 * len(slices)):
            return None

        if ratio <= ctx.config.sparse_ratio:
            return Hit(
                rule=self.name,
                offset=ctx.offset,
                length=k,
                info={"unique_count": len(unique_vals), "ratio": ratio, "k": k}
            )

        return None
