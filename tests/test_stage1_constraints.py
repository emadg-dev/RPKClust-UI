import pytest
from rpkclust.model import Message, Candidate, Pair
from rpkclust.config import Config
from rpkclust.constraints.posterior import compute_star_posterior
from rpkclust.constraints.stage1 import compute_eer, evaluate_stage1

def test_compute_eer_separated():
    # Intra-cluster similarities high [0.8, 0.95], inter-cluster low [0.1, 0.2]
    inner = [0.80, 0.85, 0.90, 0.95]
    inter = [0.10, 0.15, 0.20, 0.25]
    eer = compute_eer(inner, inter)
    assert eer < 0.15

def test_star_posterior_monotonic():
    p_arrow = {"sim": 0.8, "coupling": 0.9, "struct": 0.9, "dim": 0.9}
    p_back = {"sim": 0.8, "coupling": 0.8, "struct": 0.8, "dim": 0.7}

    # All high observations -> high posterior
    high_obs = {"sim": 0.90, "coupling": 0.90, "struct": 0.90, "dim": 0.95}
    p_high = compute_star_posterior(high_obs, p_arrow, p_back)

    # All low observations -> low posterior
    low_obs = {"sim": 0.10, "coupling": 0.10, "struct": 0.10, "dim": 0.10}
    p_low = compute_star_posterior(low_obs, p_arrow, p_back)

    assert p_high > 0.80
    assert p_low < 0.20
    assert p_high > p_low

def test_evaluate_stage1_ranking():
    cfg = Config()
    # Messages with keyword at offset 2 (values 0x01, 0x02)
    # and random byte at offset 3
    msgs = []
    for i in range(20):
        val = 0x01 if i % 2 == 0 else 0x02
        noise = (i * 17) % 256
        data = bytes([0xAA, 0xBB, val, noise, 0xCC, 0xDD])
        msgs.append(Message(id=i, data=data, direction="c2s"))

    cand_kw = Candidate(region="FOR", offset=2, length=1, kind="window")
    cand_noise = Candidate(region="FOR", offset=3, length=1, kind="window")

    res = evaluate_stage1(msgs, [cand_kw, cand_noise], boundary_b=6, config=cfg, direction="c2s")
    assert len(res.ranking) == 2
    # Keyword candidate should rank #1
    assert res.ranking[0].candidate.offset == 2
