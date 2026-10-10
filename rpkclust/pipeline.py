"""
End-to-end RPKClust pipeline execution.
Wires together preprocessing, boundary detection, candidate generation,
two-stage inference, and clustering.
"""

import time
import os
import json
from typing import List, Optional, Dict, Any, Tuple
from rpkclust.model import Message, Pair, Trace, BoundaryResult, Candidate, KeywordResult, Result
from rpkclust.config import Config
from rpkclust.boundary import find_boundary
from rpkclust.candidates import generate_candidates
from rpkclust.constraints.stage1 import evaluate_stage1
from rpkclust.constraints.stage2 import evaluate_stage2
from rpkclust.cluster import cluster_messages
from rpkclust.metrics import evaluate_clusters_against_messages

def run_pipeline(
    trace_or_messages: Any,
    config: Optional[Config] = None,
    output_dir: Optional[str] = None
) -> Result:
    """
    Run the full RPKClust protocol reverse engineering pipeline.
    """
    t0 = time.perf_counter()

    if config is None:
        config = Config()

    if isinstance(trace_or_messages, Trace):
        messages = trace_or_messages.messages
        pairs = trace_or_messages.pairs
    elif isinstance(trace_or_messages, list):
        messages = trace_or_messages
        pairs = []
    else:
        raise ValueError("Input must be Trace or List[Message]")

    # 1. FOR-NFOR Boundary Detection (Algorithm 1)
    t_boundary_start = time.perf_counter()
    boundary = find_boundary(messages=messages, config=config, pairs=pairs)
    t_boundary = time.perf_counter() - t_boundary_start

    # 2. Candidate Generation (Algorithm 2 & Algorithm 3)
    t_cand_start = time.perf_counter()
    # candidates, cand_diagnostics = generate_candidates(
    #     messages=messages,
    #     boundary=boundary,
    #     config=config
    # )
    from rpkclust.detectors.registry import all_hits, EXTRA_RULES

    extra = all_hits(messages, config, max_offset=boundary.B,
                    pairs=pairs, detectors=EXTRA_RULES)
    cand_boundary = BoundaryResult(
        B=boundary.B, hits=boundary.hits + extra,
        min_len=boundary.min_len, direction=boundary.direction)

    candidates, cand_diagnostics = generate_candidates(
        messages=messages, boundary=cand_boundary, config=config)
    t_cand = time.perf_counter() - t_cand_start

    # 3. Two-Stage Probability Inference (per direction)
    keywords: Dict[str, Optional[KeywordResult]] = {}
    stage1_results: Dict[str, Any] = {}
    stage2_results: Dict[str, Any] = {}

    directions_to_run = ["c2s", "s2c"]
    # Check if there are messages for both directions
    present_dirs = {m.direction for m in messages}
    if "c2s" not in present_dirs and "s2c" not in present_dirs:
        directions_to_run = ["both"]

    t_infer_start = time.perf_counter()
    for d in directions_to_run:
        s1 = evaluate_stage1(
            messages=messages,
            candidates=candidates,
            boundary_b=boundary.B,
            config=config,
            pairs=pairs,
            direction=d
        )
        stage1_results[d] = s1

        kw = evaluate_stage2(
            messages=messages,
            stage1_result=s1,
            config=config,
            direction=d
        )
        stage2_results[d] = kw
        keywords[d] = kw

    t_infer = time.perf_counter() - t_infer_start

    # 4. Final Message Clustering
    clusters = cluster_messages(messages, keywords)

    # 5. Metrics calculation if labels present
    h, c, v = evaluate_clusters_against_messages(messages, clusters)
    total_time = time.perf_counter() - t0

    diagnostics: Dict[str, Any] = {
        "timing": {
            "total_sec": total_time,
            "boundary_sec": t_boundary,
            "candidates_sec": t_cand,
            "inference_sec": t_infer,
        },
        "boundary_b": boundary.B,
        "min_len": boundary.min_len,
        "hits_count": len(boundary.hits),
        "candidates_count": len(candidates),
        "metrics": {
            "homogeneity": h,
            "completeness": c,
            "v_measure": v
        },
        "cand_diagnostics": cand_diagnostics,
        "directions": directions_to_run,
    }

    result = Result(
        boundary=boundary,
        candidates=candidates,
        keywords=keywords,
        clusters=clusters,
        diagnostics=diagnostics
    )

    # Export intermediate JSON artifacts if output_dir provided
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        # 1. Boundary artifact
        with open(os.path.join(output_dir, "03_boundary.json"), "w", encoding="utf-8") as f:
            json.dump({
                "B": boundary.B,
                "min_len": boundary.min_len,
                "hits": [{"rule": h.rule, "offset": h.offset, "length": h.length, "info": h.info} for h in boundary.hits]
            }, f, indent=2)

        # 2. Candidates artifact
        with open(os.path.join(output_dir, "04_candidates.json"), "w", encoding="utf-8") as f:
            json.dump([
                {
                    "region": c.region,
                    "offset": c.offset,
                    "length": c.length,
                    "kind": c.kind,
                    "tlv_type": c.tlv_type.hex() if c.tlv_type else None
                } for c in candidates
            ], f, indent=2)

        # 3. Keywords & Clusters
        with open(os.path.join(output_dir, "keywords.json"), "w", encoding="utf-8") as f:
            kw_dump = {}
            for d_name, kw_res in keywords.items():
                if kw_res:
                    kw_dump[d_name] = {
                        "offset": kw_res.candidate.offset,
                        "length": kw_res.candidate.length,
                        "region": kw_res.candidate.region,
                        "posterior": kw_res.posterior,
                        "p_bit": kw_res.p_bit,
                        "p_offset": kw_res.p_offset,
                        "p_f": kw_res.p_f,
                        "ranking": [
                            {
                                "offset": r["candidate"].offset,
                                "length": r["candidate"].length,
                                "region": r["candidate"].region,
                                "posterior": r["posterior"],
                                "p_bit": r["p_bit"],
                                "p_offset": r["p_offset"],
                                "p_f": r["p_f"],
                            } for r in kw_res.ranking
                        ]
                    }
            json.dump(kw_dump, f, indent=2)

        with open(os.path.join(output_dir, "clusters.json"), "w", encoding="utf-8") as f:
            json.dump(clusters, f, indent=2)

    return result
