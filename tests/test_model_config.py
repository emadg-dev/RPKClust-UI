import json
from rpkclust.model import Message, Candidate
from rpkclust.config import Config

def test_config_json_roundtrip():
    cfg = Config(stage1_top_k=7, pos_nfor=0.65)
    json_str = cfg.to_json()
    reloaded = Config.from_json(json_str)
    assert reloaded.stage1_top_k == 7
    assert reloaded.pos_nfor == 0.65
    assert reloaded.fo_lengths_for_candidates == (1, 2, 4)

def test_candidate_extraction():
    msg = Message(id=0, data=bytes([0x05, 0x64, 0x01, 0x02, 0x03]))
    cand_for = Candidate(region="FOR", offset=2, length=1)
    extracted = cand_for.extract(msg)
    assert extracted == bytes([0x01])

    # Beyond length
    cand_out = Candidate(region="FOR", offset=10, length=2)
    assert cand_out.extract(msg) is None
