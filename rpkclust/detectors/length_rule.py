"""
Length Field Detector: identifies fields whose values correspond to packet or payload length.
Formula: exists c in [-16, 16] such that val + c == len(m) or val + c == len(m) - offset.
"""

from collections import Counter
from typing import List, Optional
from rpkclust.detectors.base import Context
from rpkclust.model import Hit

class LengthDetector:
    name: str = "length"
    lengths = (1, 2, 4)

    def check(self, slices: List[bytes], ctx: Context) -> Optional[Hit]:
        if not ctx.config.enable_length or not slices:
            return None

        # If all messages have identical length, length cannot be safely distinguished from constants
        msg_lengths = [len(m.data) for m in ctx.messages]
        if len(set(msg_lengths)) < 2:
            return None

        k = len(slices[0])
        offset = ctx.offset

        MAX_LEN = getattr(ctx.config, "max_message_len", 500)
        for endian in ("big", "little"):
            vals = [int.from_bytes(s, endian) for s in slices]
            usable = [(L, v) for L, v in zip(msg_lengths, vals) if L < MAX_LEN]
            if len(usable) < 10:
                continue
            for variant, adj in (("total_len", 0), ("remaining_len", offset)):
                cnt = Counter((L - adj) - v for L, v in usable)
                c, n = cnt.most_common(1)[0]
                if n / len(usable) >= 0.9 and -32 <= c <= 32:
                    return Hit(rule=self.name, offset=offset, length=k,
                            info={"c": c, "variant": variant, "endian": endian})

            # Test 2: val + c == len(m) - offset
            c_candidates_remaining = {(msg_len - offset) - v for msg_len, v in zip(msg_lengths, vals)}
            if len(c_candidates_remaining) == 1:
                c = next(iter(c_candidates_remaining))
                if -32 <= c <= 32:
                    return Hit(
                        rule=self.name,
                        offset=offset,
                        length=k,
                        info={"c": c, "variant": "remaining_len", "endian": endian}
                    )

        return None
