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

    # NFOR TLV parameters
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
    for_exclude_rules: List[str] = field(default_factory=lambda: [
        "constant", "sequence", "timestamp", "float", "length", "checksum", "address"
    ])

    # Boundary detection
    boundary_per_direction: bool = False
    boundary_require_contiguous: bool = False
    boundary_min_msgs: int = 20

    # Stage 1 Clustering constraints
    stage1_top_k: int = 5
    sim_sample_size: int = 200
    sim_sample_pairs: int = 20000
    p_imp: Dict[str, Tuple[float, Optional[float]]] = field(default_factory=lambda: {
        "sim": (0.8, None),
        "other": (0.9, None),
    })
    pair_min_ratio: float = 0.3
    struct_mode: str = "length"  # "length" or "mafft"
    predicate_mode: str = "per_cluster"  # "per_cluster" or "mean"
    norm_range: Tuple[float, float] = (0.1, 0.95)

    # Stage 2 Self-constraints
    pos_for: Tuple[float, float, float] = (0.95, 0.01, 0.70)  # base, slope, floor
    pos_nfor: float = 0.60
    bituse_endian: str = "big"

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
