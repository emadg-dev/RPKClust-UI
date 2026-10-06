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
    If one direction identified a high-confidence keyword (e.g. client function code),
    and the other direction has lower confidence, the global keyword is used.
    """
    all_kws = [kw for kw in keywords.values() if kw and kw.candidate]
    best_overall = max(all_kws, key=lambda k: k.posterior) if all_kws else None

    clusters: Dict[int, str] = {}

    for m in messages:
        dir_key = m.direction if m.direction in ("c2s", "s2c") else "c2s"
        kw_res = keywords.get(dir_key)

        chosen_cand = None
        if kw_res and kw_res.candidate:
            if best_overall and (best_overall.posterior >= kw_res.posterior):
                # Use higher-confidence dominant keyword across protocol if extractable
                if best_overall.candidate.extract(m) is not None:
                    chosen_cand = best_overall.candidate
                else:
                    chosen_cand = kw_res.candidate
            else:
                chosen_cand = kw_res.candidate
        elif best_overall:
            chosen_cand = best_overall.candidate

        if chosen_cand is not None:
            val = chosen_cand.extract(m)
            if val is not None:
                clusters[m.id] = f"{m.direction}_{val.hex()}"
            else:
                clusters[m.id] = f"{m.direction}_none"
        else:
            clusters[m.id] = f"{m.direction}_unclassified"

    return clusters
