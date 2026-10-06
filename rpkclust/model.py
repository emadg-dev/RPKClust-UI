"""
Core data models and dataclasses for RPKClust.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Tuple, Any

@dataclass(frozen=True)
class Message:
    id: int
    data: bytes              # Application layer payload
    ts: float = 0.0          # Epoch seconds
    src: str = "127.0.0.1"
    dst: str = "127.0.0.1"
    sport: int = 0
    dport: int = 0
    direction: str = "c2s"   # "c2s" | "s2c" | "unk"
    session_id: int = 0
    label: Optional[str] = None  # Ground truth label (evaluation only)

@dataclass(frozen=True)
class Pair:
    req_id: int
    resp_id: int
    session_id: int

@dataclass(frozen=True)
class Trace:
    messages: List[Message]
    pairs: List[Pair] = field(default_factory=list)
    capture_range: Tuple[float, float] = (0.0, 0.0)

@dataclass(frozen=True)
class Hit:
    rule: str
    offset: int
    length: int
    info: Dict[str, Any] = field(default_factory=dict)

# DetectionResult is an alias for Hit
DetectionResult = Hit

@dataclass(frozen=True)
class Candidate:
    region: str              # "FOR" | "NFOR"
    offset: int              # FOR: fixed offset; NFOR: first observed offset
    length: int              # Window length or V length
    kind: str = "window"     # "window" | "tlv"
    direction: str = "both"  # "both" | "c2s" | "s2c"
    tlv_type: Optional[bytes] = None
    endian: str = "big"

    def extract(self, m: Message) -> Optional[bytes]:
        """Extract field bytes from message according to candidate specification."""
        if self.region == "FOR":
            end = self.offset + self.length
            if len(m.data) >= end:
                return m.data[self.offset:end]
            return None
        elif self.region == "NFOR":
            # For TLV candidate, find the TLV matching self.tlv_type
            if self.tlv_type is None:
                # Fallback to offset extraction if simple window in NFOR
                end = self.offset + self.length
                if len(m.data) >= end:
                    return m.data[self.offset:end]
                return None

            t_len = len(self.tlv_type)
            l_len = 1 if self.length <= 255 else 2
            # Scan message payload for matching type
            off = 0
            while off + t_len + l_len <= len(m.data):
                tag = m.data[off:off + t_len]
                if tag == self.tlv_type:
                    val_len = int.from_bytes(m.data[off + t_len:off + t_len + l_len], byteorder=self.endian)
                    val_start = off + t_len + l_len
                    val_end = val_start + val_len
                    if val_end <= len(m.data):
                        # Returns the Value bytes
                        return m.data[val_start:val_end]
                # Advance 1 byte if not matched
                off += 1
            return None
        return None

    def key(self) -> Tuple:
        return (self.region, self.offset, self.length, self.kind, self.tlv_type)

@dataclass
class BoundaryResult:
    B: int
    hits: List[Hit]
    min_len: int
    direction: str = "both"

@dataclass
class ScoredCandidate:
    candidate: Candidate
    p_m: float
    p_r: float
    p_s: float
    p_d: float
    p_f: float
    rank: int = 0
    clusters: Dict[Optional[bytes], List[int]] = field(default_factory=dict)

@dataclass
class Stage1Result:
    ranking: List[ScoredCandidate]
    top_k: List[Candidate]
    details: Dict[str, Any] = field(default_factory=dict)

@dataclass
class KeywordResult:
    direction: str
    candidate: Candidate
    posterior: float
    p_bit: float
    p_offset: float
    p_f: float
    ranking: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class Result:
    boundary: BoundaryResult
    candidates: List[Candidate]
    keywords: Dict[str, Optional[KeywordResult]]
    clusters: Dict[int, str]
    diagnostics: Dict[str, Any] = field(default_factory=dict)
