from rpkclust.model import Message
from rpkclust.config import Config
from rpkclust.boundary import find_boundary

def test_boundary_detection_synthetic():
    cfg = Config()
    # Messages with 4-byte fixed header:
    # offset 0..1: constant (0x05, 0x64)
    # offset 2: sequence ID
    # offset 3: sparse opcode (1, 2)
    # offset 4..: variable random payload
    msgs = []
    for i in range(10):
        hdr = bytes([0x05, 0x64, i + 1, 1 if i % 2 == 0 else 2])
        payload = bytes([i] * (10 + (i % 5)))
        msgs.append(Message(id=i, data=hdr + payload, ts=float(i)))

    res = find_boundary(msgs, cfg)
    # B must be at least 4
    assert res.B >= 4
    assert res.min_len >= 10

def test_fig1_boundary_check():
    cfg = Config()
    # Toy trace hex data
    hex_lines = [
        "05 64 0b c4 44 33 33 44 ac d1 c6 c5 01 3c 00 00 93 24",
        "05 64 0a 44 33 44 44 33 6e 25 e0 c5 81 00 00 02 ee",
        "05 64 0b c4 44 33 33 44 ac d1 c7 c6 01 3c 00 00 7e f4",
        "05 64 0a 44 33 44 44 33 6e 25 e1 c6 81 00 00 45 c7",
        "05 64 0b c4 44 33 33 44 ac d1 c8 c7 02 50 01 2b 00 00",
        "05 64 0a 44 33 44 44 33 6e 25 e2 c7 81 00 00 a7 60",
        "05 64 0d c4 44 33 33 44 6d c3 c6 c6 02 50 01 00 00 00 00 34",
        "05 64 0b 44 33 44 44 33 7c ae c6 c6 81 00 00 00 36 71",
    ]
    msgs = [Message(id=i, data=bytes.fromhex(l.replace(" ", "")), ts=float(i)) for i, l in enumerate(hex_lines)]
    res = find_boundary(msgs, cfg)
    # Offset 12 (values: 01, 81, 02) is sparse (3 distinct non-zero)
    # So boundary B must cover at least offset 12 -> B >= 13
    assert res.B >= 13
