"""Verify the numpy-vectorized running checksum values are bit-exact
with the detector's pure-Python calc_* functions."""
import random
import sys
import zlib

import numpy as np

sys.path.insert(0, ".")
from rpkclust.detectors.checksum import (
    calc_crc8, calc_crc16_ccitt, calc_crc16_dnp, calc_crc16_modbus,
    calc_crc32, calc_sum8, calc_xor8,
)


def build_table(datas, limit):
    n = len(datas)
    data = np.zeros((n, limit), dtype=np.uint8)
    for i, d in enumerate(datas):
        data[i] = np.frombuffer(d[:limit], dtype=np.uint8)

    table = {}
    table["xor8"] = np.bitwise_xor.accumulate(data, axis=1)
    table["sum8"] = (np.cumsum(data, axis=1) & 0xFF).astype(np.uint8)

    crc = np.zeros(n, dtype=np.uint16)
    out = np.zeros((n, limit), dtype=np.uint8)
    for j in range(limit):
        crc ^= data[:, j]
        for _ in range(8):
            crc = np.where(crc & 0x80, ((crc << 1) ^ 0x07) & 0xFF,
                           (crc << 1) & 0xFF)
        out[:, j] = crc
    table["crc8"] = out

    crc = np.full(n, 0xFFFF, dtype=np.uint16)
    out = np.zeros((n, limit), dtype=np.uint16)
    for j in range(limit):
        crc ^= data[:, j]
        for _ in range(8):
            crc = np.where(crc & 1, (crc >> 1) ^ 0xA001, crc >> 1)
        out[:, j] = crc
    table["crc16-modbus"] = out

    crc = np.full(n, 0xFFFF, dtype=np.uint32)
    out = np.zeros((n, limit), dtype=np.uint16)
    for j in range(limit):
        crc ^= data[:, j].astype(np.uint32) << 8
        for _ in range(8):
            crc = np.where(crc & 0x8000, ((crc << 1) ^ 0x1021) & 0xFFFF,
                           (crc << 1) & 0xFFFF)
        out[:, j] = crc
    table["crc16-ccitt"] = out

    crc = np.zeros(n, dtype=np.uint16)
    out = np.zeros((n, limit), dtype=np.uint16)
    for j in range(limit):
        crc ^= data[:, j]
        for _ in range(8):
            crc = np.where(crc & 1, (crc >> 1) ^ 0xA6BC, crc >> 1)
        out[:, j] = (~crc) & 0xFFFF
    table["crc16-dnp"] = out

    out = np.zeros((n, limit), dtype=np.uint32)
    for i, d in enumerate(datas):
        crc = 0
        row = d[:limit]
        for j in range(limit):
            crc = zlib.crc32(row[j:j + 1], crc) & 0xFFFFFFFF
            out[i, j] = crc
    table["crc32"] = out
    return table


def main():
    random.seed(42)
    # random lengths, including messages longer than limit
    datas = [bytes(random.randrange(256) for _ in range(random.randrange(1, 400)))
             for _ in range(60)]
    limit = 300
    # only keep messages at least as long as limit for the exactness check
    datas = [d for d in datas if len(d) >= limit]
    print(f"checking {len(datas)} messages, limit={limit}")
    table = build_table(datas, limit)

    fns = {
        "xor8": calc_xor8,
        "sum8": calc_sum8,
        "crc8": calc_crc8,
        "crc16-modbus": calc_crc16_modbus,
        "crc16-ccitt": calc_crc16_ccitt,
        "crc16-dnp": calc_crc16_dnp,
        "crc32": calc_crc32,
    }
    mismatches = 0
    for algo, fn in fns.items():
        arr = table[algo]
        for i, d in enumerate(datas):
            for off in range(1, limit + 1):
                expected = fn(d[:off])
                got = int(arr[i, off - 1])
                if expected != got:
                    mismatches += 1
                    if mismatches <= 5:
                        print(f"MISMATCH {algo} msg={i} off={off}: "
                              f"py={expected} np={got}")
    print("total mismatches:", mismatches)
    print("OK" if mismatches == 0 else "FAILED")


if __name__ == "__main__":
    main()
