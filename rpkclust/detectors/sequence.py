"""
Sequence ID Detector: fixed-step counter without value wrap-around.
"""

from typing import List, Optional
import numpy as np
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
        order = np.argsort([m.ts for m in ctx.messages])
        max_val = (1 << (8 * k)) - 1

        for endian in ("big", "little"):
            vals = np.array([int.from_bytes(slices[idx], byteorder=endian) for idx in order], dtype=np.int64)
            diffs = np.diff(vals)

            if len(diffs) == 0:
                continue

            delta = diffs[0]
            if delta != 0 and np.all(diffs == delta):
                # Check no wrap-around: values are strictly inside [0, 2^(8k)-1]
                if np.all((vals >= 0) & (vals <= max_val)):
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
                    dir_vals = np.array([int.from_bytes(slices[i], byteorder=endian) for i in dir_indices], dtype=np.int64)
                    dir_diffs = np.diff(dir_vals)
                    d_delta = dir_diffs[0]
                    if d_delta != 0 and np.all(dir_diffs == d_delta):
                        if np.all((dir_vals >= 0) & (dir_vals <= max_val)):
                            return Hit(
                                rule=self.name,
                                offset=ctx.offset,
                                length=k,
                                info={"step": int(d_delta), "endian": endian, "direction": direction, "k": k}
                            )

        return None
