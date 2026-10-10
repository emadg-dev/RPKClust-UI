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
    dt: float = 0.0

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
    length: int              # Window length (FOR) or V length (NFOR)
    kind: str = "window"     # "window" | "tlv"
    direction: str = "both"  # "both" | "c2s" | "s2c"
    tlv_type: Optional[bytes] = None
    endian: str = "big"
    t_len: int = 1           # TLV Type field length (NFOR only)
    l_len: int = 1           # TLV Length field length (NFOR only)

    def extract(self, m: Message) -> Optional[bytes]:
        """
        Extract field bytes from message according to candidate specification.

        For NFOR TLV candidates, returns the combined Type+Value (T-V) bytes
        as the keyword field (Sec. 3.5: "use T-V as the combined keyword field
        candidates").
        """
        if self.region == "FOR":
            end = self.offset + self.length
            if len(m.data) >= end:
                return m.data[self.offset:end]
            return None
        elif self.region == "NFOR":
            if self.tlv_type is None:
                end = self.offset + self.length
                if len(m.data) >= end:
                    return m.data[self.offset:end]
                return None

            # Use stored t_len and l_len (no guessing)
            t_len = self.t_len
            l_len = self.l_len
            off = 0
            while off + t_len + l_len <= len(m.data):
                tag = m.data[off:off + t_len]
                if tag == self.tlv_type:
                    val_len = int.from_bytes(
                        m.data[off + t_len:off + t_len + l_len], byteorder=self.endian
                    )
                    val_start = off + t_len + l_len
                    val_end = val_start + val_len
                    if val_end <= len(m.data):
                        # R-01: return combined T-V (type_bytes + value_bytes), not T-L-V
                        return m.data[off:off + t_len] + m.data[val_start:val_end]
                off += 1
            return None
        return None

    def key(self) -> Tuple:
        return (self.region, self.offset, self.length, self.kind, self.tlv_type, self.t_len, self.l_len)

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
