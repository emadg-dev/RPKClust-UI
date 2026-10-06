"""
Float Detector: validates plausible IEEE-754 floating point values.
"""

from typing import List, Optional
import struct
import math
from rpkclust.detectors.base import Context
from rpkclust.model import Hit

class FloatDetector:
    name: str = "float"
    lengths = (4, 8)

    def check(self, slices: List[bytes], ctx: Context) -> Optional[Hit]:
        if not ctx.config.enable_float or not slices:
            return None

        k = len(slices[0])
        fmt_base = "f" if k == 4 else "d"

        for endian in ("big", "little"):
            fmt = (">" if endian == "big" else "<") + fmt_base
            decoded = []
            is_valid = True

            for s in slices:
                try:
                    val = struct.unpack(fmt, s)[0]
                    if math.isnan(val) or math.isinf(val):
                        is_valid = False
                        break
                    # Must be within plausible physical range or 0
                    if val != 0.0 and (abs(val) < 1e-6 or abs(val) > 1e9):
                        is_valid = False
                        break
                    decoded.append(val)
                except Exception:
                    is_valid = False
                    break

            if is_valid and len(decoded) == len(slices):
                unique_floats = set(decoded)
                if len(unique_floats) >= ctx.config.float_min_distinct:
                    # Check that they aren't all round integers
                    non_int_count = sum(1 for v in decoded if v != int(v))
                    if non_int_count >= 0.3 * len(decoded):
                        return Hit(
                            rule=self.name,
                            offset=ctx.offset,
                            length=k,
                            info={"endian": endian, "unique_count": len(unique_floats)}
                        )

        return None
