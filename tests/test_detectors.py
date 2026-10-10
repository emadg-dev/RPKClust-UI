import struct
from rpkclust.model import Message, Pair
from rpkclust.config import Config
from rpkclust.detectors.base import Context
from rpkclust.detectors.constant import ConstantDetector
from rpkclust.detectors.sequence import SequenceDetector
from rpkclust.detectors.timestamp import TimestampDetector
from rpkclust.detectors.sparse import SparseDetector
from rpkclust.detectors.checksum import ChecksumDetector, calc_crc16_dnp, calc_xor8
from rpkclust.detectors.float_rule import FloatDetector
from rpkclust.detectors.length_rule import LengthDetector
from rpkclust.detectors.address import AddressDetector

def make_ctx(msgs, offset=0, pairs=None, capture_range=(1000.0, 2000.0)):
    return Context(
        messages=msgs,
        offset=offset,
        capture_range=capture_range,
        pairs=pairs or [],
        config=Config()
    )

def test_constant_detector():
    det = ConstantDetector()
    msgs = [Message(id=i, data=b"\x05\x64\xaa") for i in range(5)]
    ctx = make_ctx(msgs, offset=0)
    # Positive
    hit = det.check([b"\x05" for _ in msgs], ctx)
    assert hit is not None and hit.rule == "constant"
    # Negative
    slices_diff = [bytes([i]) for i in range(5)]
    assert det.check(slices_diff, ctx) is None
    # One outlier
    slices_outlier = [b"\x05"] * 4 + [b"\x06"]
    assert det.check(slices_outlier, ctx) is None

def test_sequence_detector():
    det = SequenceDetector()
    # Positive 1-byte counter
    msgs = [Message(id=i, ts=float(i), data=bytes([i + 1])) for i in range(5)]
    ctx = make_ctx(msgs, offset=0)
    hit = det.check([m.data for m in msgs], ctx)
    assert hit is not None and hit.rule == "sequence"
    assert hit.info["step"] == 1

    # Outlier
    msgs_out = [Message(id=i, ts=float(i), data=bytes([1, 2, 9, 4, 5][i:i+1])) for i in range(5)]
    ctx_out = make_ctx(msgs_out, offset=0)
    assert det.check([m.data for m in msgs_out], ctx_out) is None

def test_timestamp_detector():
    det = TimestampDetector()
    # Unix seconds inside contemporary capture window +/- 86400
    base_ts = 1700000000
    msgs = [Message(id=i, ts=float(base_ts + i), data=int(base_ts + i).to_bytes(4, "big")) for i in range(5)]
    ctx = make_ctx(msgs, offset=0, capture_range=(float(base_ts), float(base_ts + 10)))
    hit = det.check([m.data for m in msgs], ctx)
    assert hit is not None and hit.rule == "timestamp"

    # Outlier far in past (0)
    slices_bad = [int(base_ts).to_bytes(4, "big")] * 4 + [int(0).to_bytes(4, "big")]
    assert det.check(slices_bad, ctx) is None

def test_sparse_detector():
    det = SparseDetector()
    # 3 distinct non-zero values (3 / 256 <= 0.02)
    slices = [b"\x01", b"\x02", b"\x81", b"\x01", b"\x02"]
    msgs = [Message(id=i, data=slices[i]) for i in range(5)]
    ctx = make_ctx(msgs, offset=0)
    hit = det.check(slices, ctx)
    assert hit is not None and hit.rule == "sparse"

    # Zero value present -> should not fire
    slices_zero = [b"\x00", b"\x01", b"\x02"]
    assert det.check(slices_zero, ctx) is None

def test_checksum_detector():
    det = ChecksumDetector()
    # Build messages with 2-byte DNP3 CRC at offset 4
    msgs = []
    slices = []
    for i in range(5):
        prefix = bytes([0x05, 0x64, i, i + 1])
        crc = calc_crc16_dnp(prefix)
        crc_bytes = crc.to_bytes(2, "little")
        full = prefix + crc_bytes + b"\x00\x00"
        msgs.append(Message(id=i, data=full))
        slices.append(crc_bytes)

    ctx = make_ctx(msgs, offset=4)
    hit = det.check(slices, ctx)
    assert hit is not None and hit.rule == "checksum"
    assert "crc16-dnp" in hit.info["algo"]

    # One corrupted CRC -> fails
    slices_bad = list(slices)
    slices_bad[0] = b"\x00\x00"
    assert det.check(slices_bad, ctx) is None

def test_length_detector():
    det = LengthDetector()
    # Variable-length messages with 1-byte length at offset 1
    msgs = [
        Message(id=0, data=b"\x00\x05\xaa\xbb\xcc"),
        Message(id=1, data=b"\x00\x07\xaa\xbb\xcc\xdd\xee"),
        Message(id=2, data=b"\x00\x04\xaa\xbb"),
    ]
    slices = [bytes([len(m.data)]) for m in msgs]
    ctx = make_ctx(msgs, offset=1)
    hit = det.check(slices, ctx)
    assert hit is not None and hit.rule == "length"
