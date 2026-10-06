"""
Address Detector: identifies client-server address pairs through alternation/swap patterns across pairs.
Formula: req[o:o+w] == resp[o+w:o+2w] and req[o+w:o+2w] == resp[o:o+w], with cross-correlation rho <= -0.8.
"""

from typing import List, Optional
import numpy as np
from rpkclust.detectors.base import Context
from rpkclust.model import Hit

class AddressDetector:
    name: str = "address"
    lengths = (2, 3, 4)

    def check(self, slices: List[bytes], ctx: Context) -> Optional[Hit]:
        if not ctx.pairs or len(ctx.pairs) < 3:
            return None

        w = len(slices[0])
        offset = ctx.offset

        # Build message index lookup
        msg_by_id = {m.id: m for m in ctx.messages}

        # Check adjacent field at offset + w
        # Needs offset + 2*w to fit in minimum message length
        min_len = min(len(m.data) for m in ctx.messages)
        if offset + 2 * w > min_len:
            return None

        # Check swap condition across all pairs
        swaps_valid = True
        req_vals_1 = []
        req_vals_2 = []

        for p in ctx.pairs:
            req = msg_by_id.get(p.req_id)
            resp = msg_by_id.get(p.resp_id)
            if not req or not resp:
                continue
            if len(req.data) < offset + 2 * w or len(resp.data) < offset + 2 * w:
                swaps_valid = False
                break

            s1_req = req.data[offset:offset + w]
            s2_req = req.data[offset + w:offset + 2 * w]
            s1_resp = resp.data[offset:offset + w]
            s2_resp = resp.data[offset + w:offset + 2 * w]

            # In symmetric protocol, response s1 == request s2 and response s2 == request s1
            if not (s1_req == s2_resp and s2_req == s1_resp):
                swaps_valid = False
                break

            req_vals_1.append(int.from_bytes(s1_req, byteorder="big"))
            req_vals_2.append(int.from_bytes(s2_req, byteorder="big"))

        if swaps_valid and len(req_vals_1) >= 3:
            # Check negative correlation or diversity
            std1 = np.std(req_vals_1)
            std2 = np.std(req_vals_2)
            if std1 > 0 and std2 > 0:
                corr = np.corrcoef(req_vals_1, req_vals_2)[0, 1]
                if corr <= ctx.config.address_corr_threshold:
                    return Hit(
                        rule=self.name,
                        offset=offset,
                        length=2 * w,
                        info={"width": w, "corr": float(corr)}
                    )
            else:
                # Constant distinct address pair that swaps exactly
                if req_vals_1[0] != req_vals_2[0]:
                    return Hit(
                        rule=self.name,
                        offset=offset,
                        length=2 * w,
                        info={"width": w, "swapped": True}
                    )

        return None
