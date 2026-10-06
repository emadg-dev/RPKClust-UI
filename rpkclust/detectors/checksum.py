"""
Checksum Detector: detects algorithmic checksums (CRC-16, DNP-CRC, CRC-32, XOR-8, SUM-8).
Checks if A(data_range) == s for all messages.
"""

from typing import List, Optional
import zlib
from rpkclust.detectors.base import Context
from rpkclust.model import Hit

def calc_xor8(data: bytes) -> int:
    res = 0
    for b in data:
        res ^= b
    return res & 0xFF

def calc_sum8(data: bytes) -> int:
    return sum(data) & 0xFF

def calc_crc8(data: bytes, poly: int = 0x07) -> int:
    crc = 0x00
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 0x80:
                crc = ((crc << 1) ^ poly) & 0xFF
            else:
                crc = (crc << 1) & 0xFF
    return crc & 0xFF

def calc_crc16_modbus(data: bytes) -> int:
    crc = 0xFFFF
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 0x0001:
                crc = (crc >> 1) ^ 0xA001
            else:
                crc = crc >> 1
    return crc & 0xFFFF

def calc_crc16_ccitt(data: bytes) -> int:
    crc = 0xFFFF
    for b in data:
        crc ^= (b << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return crc & 0xFFFF

def calc_crc16_dnp(data: bytes) -> int:
    # DNP3 CRC: polynomial 0x3D65 (reverse: 0xA6BC), init 0x0000, final XOR 0xFFFF
    crc = 0x0000
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 0x0001:
                crc = (crc >> 1) ^ 0xA6BC
            else:
                crc = crc >> 1
    return (~crc) & 0xFFFF

def calc_crc32(data: bytes) -> int:
    return zlib.crc32(data) & 0xFFFFFFFF


class ChecksumDetector:
    name: str = "checksum"
    lengths = (1, 2, 4)

    def check(self, slices: List[bytes], ctx: Context) -> Optional[Hit]:
        if not slices:
            return None

        k = len(slices[0])
        offset = ctx.offset

        # Check algorithms according to k
        algos_to_try = []
        if k == 1:
            algos_to_try = [
                ("xor8", calc_xor8),
                ("sum8", calc_sum8),
                ("crc8", calc_crc8),
            ]
        elif k == 2:
            algos_to_try = [
                ("crc16-modbus", calc_crc16_modbus),
                ("crc16-ccitt", calc_crc16_ccitt),
                ("crc16-dnp", calc_crc16_dnp),
            ]
        elif k == 4:
            algos_to_try = [
                ("crc32", calc_crc32),
            ]

        # For header checksum: data range is [0:offset]
        if offset > 0:
            for algo_name, algo_fn in algos_to_try:
                for endian in ("little", "big") if k > 1 else ("big",):
                    match = True
                    for m, s in zip(ctx.messages, slices):
                        expected = int.from_bytes(s, byteorder=endian)
                        data_slice = m.data[:offset]
                        if not data_slice:
                            match = False
                            break
                        if algo_fn(data_slice) != expected:
                            match = False
                            break
                    if match:
                        return Hit(
                            rule=self.name,
                            offset=offset,
                            length=k,
                            info={"algo": algo_name, "range": f"[0:{offset}]", "endian": endian}
                        )

        return None
