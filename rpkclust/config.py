"""
Configuration module for RPKClust.
Single source of truth for all parameters, thresholds, and options.
"""

from dataclasses import dataclass, field, asdict
import json
from typing import Tuple, List, Dict, Any, Optional

@dataclass
class Config:
    # FOR candidate generation window sizes
    fo_lengths_for_candidates: Tuple[int, ...] = (1, 2, 4)

    # FOR cardinality pre-filter (R-07: None disables by default)
    candidate_max_distinct_ratio: Optional[float] = None

    # NFOR TLV parameters
    # When tlv_auto_params=False (default), use fixed tlv_t_len / tlv_l_len / tlv_endian
    # When True, grid search over tlv_t_lens / tlv_l_lens / tlv_endians
    tlv_auto_params: bool = False
    tlv_t_len: int = 1
    tlv_l_len: int = 1
    tlv_endian: str = "big"
    tlv_t_lens: Tuple[int, ...] = (1, 2)
    tlv_l_lens: Tuple[int, ...] = (1, 2)
    tlv_endians: Tuple[str, ...] = ("big", "little")
    tlv_min_repeats: int = 2
    tlv_min_coverage: float = 0.6
    tlv_min_presence: float = 0.8
    tlv_max_type_cardinality: int = 255

    # Semantic Detectors
    const_max_len: int = 8
    seq_match_ratio: float = 1.0
    timestamp_slack_s: float = 86400.0
    sparse_ratio: float = 0.02
    address_corr_threshold: float = -0.8
    checksum_algorithms: List[str] = field(default_factory=lambda: [
        "sum8", "xor8", "crc8", "crc16-ccitt", "crc16-modbus", "crc16-dnp", "crc32"
    ])
    float_min_distinct: int = 5
    enable_float: bool = True
    enable_length: bool = True
    # Rules excluded from FOR candidates (R-05: Length excluded from boundary, kept in FOR exclusion)
    for_exclude_rules: List[str] = field(default_factory=lambda: [
        "constant", "sequence", "timestamp", "float", "length", "checksum", "address"
    ])

    # Boundary detection
    boundary_per_direction: bool = False
    boundary_require_contiguous: bool = False
    boundary_min_msgs: int = 20
    # R-05: Include Float and Length detectors in boundary scan (paper uses 6 rules only)
    boundary_include_extra_rules: bool = False

    # Stage 1 Clustering constraints
    stage1_top_k: int = 5  # R-19: default between 3 and 5 per paper Table 3
    sim_sample_size: int = 200
    sim_sample_pairs: int = 20000
    pair_min_ratio: float = 0.3
    struct_mode: str = "length"  # "length" or "mafft"
    predicate_mode: str = "per_cluster"  # "per_cluster" or "mean"
    # R-10: Min-max normalization of p_m, p_r, p_s across candidates
    stage1_normalize: bool = False
    norm_range: Tuple[float, float] = (0.1, 0.95)

    # Stage 2 Self-constraints
    pos_for: Tuple[float, float, float] = (0.95, 0.01, 0.70)  # base, slope, floor
    pos_nfor: float = 0.60
    bituse_endian: str = "big"
    # R-14: Mode for D_max computation in bit-use constraint
    dmax_mode: str = "max_over_m"  # "max_over_m" | "m_equals_msb"

    # R-12: Probability clip range (None = no clamp, only 1e-12 numeric guard)
    prob_clip: Optional[Tuple[float, float]] = None

    # R-18: Clustering label mode
    cluster_label_mode: str = "per_direction"  # "per_direction" or "global"

    # Execution & Reproducibility
    seed: int = 0
    session_gap_s: float = 300.0
    direction_mode: str = "port"  # "port", "first_packet", "none"
    max_candidates: int = 64

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Config":
        cfg = cls()
        for k, v in data.items():
            if hasattr(cfg, k):
                # Ensure tuples if expected
                current_val = getattr(cfg, k)
                if isinstance(current_val, tuple) and isinstance(v, list):
                    setattr(cfg, k, tuple(v))
                else:
                    setattr(cfg, k, v)
        return cfg

    @classmethod
    def from_json(cls, json_str: str) -> "Config":
        return cls.from_dict(json.loads(json_str))
