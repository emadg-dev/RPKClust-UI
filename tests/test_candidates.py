from rpkclust.model import Message, BoundaryResult, Hit
from rpkclust.config import Config
from rpkclust.candidates.for_region import generate_for_candidates
from rpkclust.candidates.nfor_tlv import generate_nfor_candidates

def test_for_candidate_generation():
    cfg = Config()
    # 8 messages from Fig 1
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
    msgs = [Message(id=i, data=bytes.fromhex(l.replace(" ", ""))) for i, l in enumerate(hex_lines)]
    # Constant hits at 0, 1
    hits = [
        Hit(rule="constant", offset=0, length=1, info={"value": "05"}),
        Hit(rule="constant", offset=1, length=1, info={"value": "64"}),
        Hit(rule="sparse", offset=12, length=1, info={"unique_count": 3}),
    ]

    cands, diag = generate_for_candidates(msgs, boundary_b=13, semantic_hits=hits, config=cfg)
    # Check that offset 12 with length 1 is in cands
    cand_offsets = [(c.offset, c.length) for c in cands]
    assert (12, 1) in cand_offsets
    # Check that constant bytes 0 and 1 are excluded
    assert (0, 1) not in cand_offsets
    assert (1, 1) not in cand_offsets

def test_nfor_tlv_candidate_generation():
    cfg = Config(tlv_min_coverage=0.5, tlv_min_presence=0.5)
    # Messages with 4-byte header, then TLV options:
    # Option Type 0x35, len 1, val 0x01/0x02
    msgs = []
    for i in range(10):
        hdr = b"\x00\x01\x02\x03"
        opt1 = bytes([0x35, 0x01, 1 if i % 2 == 0 else 2])
        opt2 = bytes([0x3c, 0x02, 0xaa, 0xbb])
        msgs.append(Message(id=i, data=hdr + opt1 + opt2))

    cands, diag = generate_nfor_candidates(msgs, boundary_b=4, config=cfg)
    assert len(cands) >= 1
    cand_types = [c.tlv_type for c in cands if c.tlv_type is not None]
    assert b"\x35" in cand_types
