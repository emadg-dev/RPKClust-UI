from rpkclust.model import Candidate, ScoredCandidate, Stage1Result, Message
from rpkclust.config import Config
from rpkclust.constraints.stage2 import compute_bit_use_prob, compute_position_prob, evaluate_stage2
from rpkclust.constraints.posterior import combine_two_stage

def test_bit_use_example():
    # Paper Section 3.6 example:
    # 00100100 (0x24 = 36), 00000010 (0x02 = 2), 00010000 (0x10 = 16)
    values = [bytes([0b00100100]), bytes([0b00000010]), bytes([0b00010000])]
    p_bit, details = compute_bit_use_prob(values)

    # MSB is 5
    assert details["msb"] == 5
    assert len(details["q_k"]) == 6  # k = 0, 1, 2, 3, 4, 5
    # Verify p_bit is positive and healthy
    assert 0.0 < p_bit <= 1.0

def test_position_constraint():
    cfg = Config()
    cand_for_0 = Candidate(region="FOR", offset=0, length=1)
    cand_for_10 = Candidate(region="FOR", offset=10, length=1)
    cand_for_50 = Candidate(region="FOR", offset=50, length=1)
    cand_nfor = Candidate(region="NFOR", offset=100, length=1)

    assert compute_position_prob(cand_for_0, cfg) == 0.95
    assert abs(compute_position_prob(cand_for_10, cfg) - 0.85) < 1e-4
    assert compute_position_prob(cand_for_50, cfg) == 0.70  # floor
    assert compute_position_prob(cand_nfor, cfg) == 0.60

def test_two_stage_combination():
    # If p_f, p_bit, p_offset are high -> combined is very high
    p_high = combine_two_stage(p_f=0.85, p_bit=0.85, p_offset=0.90)
    # If all low -> combined is low
    p_low = combine_two_stage(p_f=0.20, p_bit=0.20, p_offset=0.60)
    assert p_high > 0.90
    assert p_low < 0.20
