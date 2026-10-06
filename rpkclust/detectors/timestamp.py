"""
Timestamp Detector: validates temporal encodings within capture window [t_start - Δ, t_end + Δ].
"""

from typing import List, Optional
from rpkclust.detectors.base import Context
from rpkclust.model import Hit

class TimestampDetector:
    name: str = "timestamp"
    lengths = (4, 8)

    def check(self, slices: List[bytes], ctx: Context) -> Optional[Hit]:
        if not slices:
            return None

        t_start, t_end = ctx.capture_range
        # If capture window is invalid / default, fallback to message timestamps or reasonable range
        if t_end <= 0:
            ts_list = [m.ts for m in ctx.messages if m.ts > 0]
            if ts_list:
                t_start, t_end = min(ts_list), max(ts_list)
            else:
                return None

        delta = ctx.config.timestamp_slack_s
        window_min = t_start - delta
        window_max = t_end + delta

        k = len(slices[0])
        for endian in ("big", "little"):
            if k == 4:
                vals = [int.from_bytes(s, byteorder=endian, signed=False) for s in slices]
                # Check unix epoch seconds
                if all(window_min <= v <= window_max for v in vals):
                    return Hit(
                        rule=self.name,
                        offset=ctx.offset,
                        length=4,
                        info={"format": "unix_sec", "endian": endian}
                    )
            elif k == 8:
                vals_ms = [int.from_bytes(s, byteorder=endian, signed=False) for s in slices]
                # Check unix milliseconds
                if all(window_min * 1000 <= v <= window_max * 1000 for v in vals_ms):
                    return Hit(
                        rule=self.name,
                        offset=ctx.offset,
                        length=8,
                        info={"format": "unix_ms", "endian": endian}
                    )
                # Check unix seconds in 8-byte integer
                if all(window_min <= v <= window_max for v in vals_ms):
                    return Hit(
                        rule=self.name,
                        offset=ctx.offset,
                        length=8,
                        info={"format": "unix_sec_int64", "endian": endian}
                    )

        return None
