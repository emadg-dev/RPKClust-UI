"""
Algorithm 3: Keyword Candidate Generation in NFOR (Non-Fixed-Offset Region).
Detects TLV patterns and generates combined T-V candidate fields.
"""

from typing import List, Dict, Tuple, Optional, Set
from rpkclust.model import Message, Candidate
from rpkclust.config import Config

def validate_tlv(
    data: bytes,
    offset: int,
    t_len: int,
    l_len: int,
    endian: str
) -> Tuple[bool, int]:
    """
    Validate TLV structure at offset.
    Returns (is_valid, length_value).
    A TLV is considered valid if:
    1. The declared length fits within data bounds.
    2. Length is non-negative and plausible.
    3. The structure either ends cleanly at packet end or chains into another valid TLV.
    """
    if offset + t_len + l_len > len(data):
        return False, 0

    val_len = int.from_bytes(data[offset + t_len:offset + t_len + l_len], byteorder=endian)
    if val_len < 0:
        return False, 0

    end = offset + t_len + l_len + val_len
    if end > len(data):
        return False, 0

    # Chain consistency check: if not end of packet, does next byte also parse as TLV?
    if end == len(data):
        return True, val_len

    if end + t_len + l_len <= len(data):
        next_val_len = int.from_bytes(data[end + t_len:end + t_len + l_len], byteorder=endian)
        if end + t_len + l_len + next_val_len <= len(data):
            return True, val_len

    # If single TLV option followed by small padding (e.g. 0x00 or 0xFF)
    rem = len(data) - end
    if rem <= 4:
        return True, val_len

    return False, val_len


def generate_nfor_candidates(
    messages: List[Message],
    boundary_b: int,
    config: Config,
    direction: str = "both"
) -> Tuple[List[Candidate], Dict[str, any]]:
    """
    Algorithm 3: Detects TLV patterns in NFOR and creates combined T-V keyword candidates.
    """
    target_msgs = [m for m in messages if m.direction == direction] if direction in ("c2s", "s2c") else messages
    if not target_msgs or boundary_b < 0:
        return [], {"tlv_candidates_count": 0}

    # Extract NFOR slices
    nfor_data = [m.data[boundary_b:] for m in target_msgs if len(m.data) > boundary_b]
    if not nfor_data:
        return [], {"tlv_candidates_count": 0}

    # R-08: Support fixed (t_len, l_len) params (default).
    # Grid search is only performed when config.tlv_auto_params=True.
    if config.tlv_auto_params:
        t_len_list = list(config.tlv_t_lens)
        l_len_list = list(config.tlv_l_lens)
        endian_list = list(config.tlv_endians)
    else:
        t_len_list = [config.tlv_t_len]
        l_len_list = [config.tlv_l_len]
        endian_list = [config.tlv_endian]

    best_config = None
    best_coverage = 0.0
    detected_tlvs_by_msg: List[List[Tuple[bytes, bytes, int]]] = []

    for t_len in t_len_list:
        for l_len in l_len_list:
            for endian in endian_list:
                parsed_count = 0
                temp_parsed: List[List[Tuple[bytes, bytes, int]]] = []

                for m_idx, m in enumerate(target_msgs):
                    nfor = m.data[boundary_b:]
                    off = 0
                    msg_tlvs = []

                    while off <= len(nfor) - (t_len + l_len):
                        valid, val_len = validate_tlv(nfor, off, t_len, l_len, endian)
                        if valid:
                            type_tag = nfor[off:off + t_len]
                            val_bytes = nfor[off + t_len + l_len:off + t_len + l_len + val_len]
                            abs_offset = boundary_b + off + t_len + l_len
                            msg_tlvs.append((type_tag, val_bytes, abs_offset))
                            off += t_len + l_len + val_len
                        else:
                            off += 1

                    if msg_tlvs:
                        parsed_count += 1
                    temp_parsed.append(msg_tlvs)

                coverage = parsed_count / len(target_msgs)
                if config.tlv_auto_params:
                    if coverage > best_coverage and coverage >= config.tlv_min_coverage:
                        best_coverage = coverage
                        best_config = (t_len, l_len, endian)
                        detected_tlvs_by_msg = temp_parsed
                else:
                    best_config = (t_len, l_len, endian)
                    best_coverage = coverage
                    detected_tlvs_by_msg = temp_parsed

    if not best_config or (config.tlv_auto_params and best_coverage < config.tlv_min_coverage):
        return [], {"best_config": None, "coverage": best_coverage}

    t_len, l_len, endian = best_config

    # Group detected TLVs by type tag T across messages
    type_occurrences: Dict[bytes, List[Tuple[bytes, int]]] = {}
    for msg_tlvs in detected_tlvs_by_msg:
        seen_in_msg = set()
        for t_tag, v_val, abs_off in msg_tlvs:
            if t_tag not in seen_in_msg:
                type_occurrences.setdefault(t_tag, []).append((v_val, abs_off))
                seen_in_msg.add(t_tag)

    candidates: List[Candidate] = []
    num_msgs = len(target_msgs)

    for t_tag, v_list in type_occurrences.items():
        presence_ratio = len(v_list) / num_msgs
        if presence_ratio >= config.tlv_min_presence:
            lengths = {len(v) for v, _ in v_list}
            if len(lengths) == 1:
                v_len = next(iter(lengths))
                first_offset = v_list[0][1]
                cand = Candidate(
                    region="NFOR",
                    offset=first_offset,
                    length=v_len,
                    kind="tlv",
                    direction=direction,
                    tlv_type=t_tag,
                    endian=endian,
                    t_len=t_len,
                    l_len=l_len,
                )
                candidates.append(cand)

    diagnostics = {
        "best_config": {"t_len": t_len, "l_len": l_len, "endian": endian},
        "coverage": best_coverage,
        "tlv_candidates_count": len(candidates),
    }

    return candidates, diagnostics
