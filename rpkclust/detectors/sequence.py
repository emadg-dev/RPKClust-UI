"""
Sequence ID Detector: fixed-step counter without value wrap-around.
"""

from typing import List, Optional
from rpkclust.detectors.base import Context
from rpkclust.model import Hit

class SequenceDetector:
    name: str = "sequence"
    lengths = (1, 2, 3, 4)

    def check(self, slices: List[bytes], ctx: Context) -> Optional[Hit]:
        if len(slices) < 3:
            return None

        k = len(slices[0])
        # Sort messages by timestamp
        order = sorted(range(len(ctx.messages)), key=lambda idx: ctx.messages[idx].ts)
        max_val = (1 << (8 * k)) - 1

        for endian in ("big", "little"):
            vals = [int.from_bytes(slices[idx], byteorder=endian) for idx in order]
            diffs = [vals[i + 1] - vals[i] for i in range(len(vals) - 1)]

            if len(diffs) == 0:
                continue

            delta = diffs[0]
            if delta != 0 and all(d == delta for d in diffs):
                # Check no wrap-around: values are strictly inside [0, 2^(8k)-1]
                if all(0 <= v <= max_val for v in vals):
                    return Hit(
                        rule=self.name,
                        offset=ctx.offset,
                        length=k,
                        info={"step": int(delta), "endian": endian, "k": k}
                    )

            # Also check per-direction monotonic sequence
            for direction in ("c2s", "s2c"):
                dir_indices = [idx for idx in order if ctx.messages[idx].direction == direction]
                if len(dir_indices) >= 3:
                    dir_vals = [int.from_bytes(slices[i], byteorder=endian) for i in dir_indices]
                    dir_diffs = [dir_vals[i + 1] - dir_vals[i] for i in range(len(dir_vals) - 1)]
                    d_delta = dir_diffs[0]
                    if d_delta != 0 and all(d == d_delta for d in dir_diffs):
                        if all(0 <= v <= max_val for v in dir_vals):
                            return Hit(
                                rule=self.name,
                                offset=ctx.offset,
                                length=k,
                                info={"step": int(d_delta), "endian": endian, "direction": direction, "k": k}
                            )

        return None

