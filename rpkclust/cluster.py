"""
Message clustering module for RPKClust.
Groups protocol messages by the inferred keyword field values per direction.
"""

from typing import List, Dict, Optional
from rpkclust.model import Message, KeywordResult


def cluster_messages(
    messages: List[Message],
    keywords: Dict[str, Optional[KeywordResult]]
) -> Dict[int, str]:
    """
    Cluster messages using ONLY the keyword inferred for the message's own
    direction (paper: keywords are per side, e.g. "12_12"; never shared).
    - keywords has key "both" (no c2s/s2c messages): use keywords["both"].
    - no keyword for the direction: "<dir>_unclassified".
    - field absent in message: "<dir>_none".
    """
    clusters: Dict[int, str] = {}

    for m in messages:
        kw_res = keywords.get(m.direction)
        if kw_res is None:
            kw_res = keywords.get("both")

        if kw_res is None or kw_res.candidate is None:
            clusters[m.id] = f"{m.direction}_unclassified"
            continue

        val = kw_res.candidate.extract(m)
        if val is None:
            clusters[m.id] = f"{m.direction}_none"
        else:
            clusters[m.id] = f"{m.direction}_{val.hex()}"

    return clusters