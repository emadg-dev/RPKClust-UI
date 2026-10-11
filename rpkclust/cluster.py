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
    Cluster messages based on inferred keyword values per direction.
    Each message uses ONLY its direction's keyword result.
    """
    clusters: Dict[int, str] = {}

    for m in messages:
        dir_key = m.direction if m.direction in ("c2s", "s2c", "both") else "c2s"
        kw_res = keywords.get(dir_key)

        chosen_cand = None
        if kw_res and kw_res.candidate:
            chosen_cand = kw_res.candidate

        if chosen_cand is not None:
            val = chosen_cand.extract(m)
            if val is not None:
                clusters[m.id] = f"{m.direction}_{val.hex()}"
            else:
                clusters[m.id] = f"{m.direction}_none"
        else:
            clusters[m.id] = f"{m.direction}_unclassified"

    return clusters
