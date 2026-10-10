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

def test_new_config_defaults():
    cfg = Config()
    # R-05
    assert cfg.boundary_include_extra_rules is False
    # R-07
    assert cfg.candidate_max_distinct_ratio is None
    # R-08
    assert cfg.tlv_auto_params is False
    # R-10
    assert cfg.stage1_normalize is False
    # R-12
    assert cfg.prob_clip is None
    # R-14
    assert cfg.dmax_mode == "max_over_m"
    # R-15
    assert cfg.bituse_endian == "big"
    # R-18
    assert cfg.cluster_label_mode == "per_direction"
    # R-19
    assert cfg.stage1_top_k == 5

def test_config_serializes_new_fields():
    cfg = Config(
        boundary_include_extra_rules=True,
        candidate_max_distinct_ratio=0.5,
        tlv_auto_params=True,
        stage1_normalize=True,
        prob_clip=(0.01, 0.99),
        dmax_mode="m_equals_msb",
        cluster_label_mode="global",
    )
    json_str = cfg.to_json()
    reloaded = Config.from_json(json_str)
    assert reloaded.boundary_include_extra_rules is True
    assert reloaded.candidate_max_distinct_ratio == 0.5
    assert reloaded.tlv_auto_params is True
    assert reloaded.stage1_normalize is True
    assert reloaded.prob_clip == [0.01, 0.99]
    assert reloaded.dmax_mode == "m_equals_msb"
    assert reloaded.cluster_label_mode == "global"

def test_candidate_extraction():
    msg = Message(id=0, data=bytes([0x05, 0x64, 0x01, 0x02, 0x03]))
    cand_for = Candidate(region="FOR", offset=2, length=1)
    extracted = cand_for.extract(msg)
    assert extracted == bytes([0x01])

    # Beyond length
    cand_out = Candidate(region="FOR", offset=10, length=2)
    assert cand_out.extract(msg) is None

def test_nfor_candidate_t_v_extraction():
    # R-01: NFOR extract should return combined T-V bytes
    # Message: [header(4B)] [type=0x35] [len=0x01] [val=0x0a] ...
    msg = Message(id=0, data=bytes([0x00, 0x01, 0x02, 0x03, 0x35, 0x01, 0x0a, 0x3c, 0x02, 0xaa, 0xbb]))
    cand = Candidate(
        region="NFOR", offset=5, length=1, kind="tlv",
        tlv_type=b"\x35", endian="big", t_len=1, l_len=1
    )
    extracted = cand.extract(msg)
    # Should return type + value: 0x35 + 0x0a
    assert extracted == bytes([0x35, 0x0a]), f"Expected combined T-V, got {extracted}"

    # R-02: t_len and l_len stored on Candidate
    assert cand.t_len == 1
    assert cand.l_len == 1
    assert cand.tlv_type == b"\x35"
