"""
End-to-end RPKClust pipeline execution.
Wires together preprocessing, boundary detection, candidate generation,
two-stage inference, and clustering.
"""

import time
import os
import json
import traceback
from typing import List, Optional, Dict, Any, Tuple
from rpkclust.detectors.registry import BOUNDARY_RULES
from rpkclust.model import Message, Pair, Trace, BoundaryResult, Candidate, KeywordResult, Result, PipelineCapture
from rpkclust.config import Config
from rpkclust.boundary import find_boundary
from rpkclust.candidates import generate_candidates
from rpkclust.constraints.stage1 import evaluate_stage1
from rpkclust.constraints.stage2 import evaluate_stage2
from rpkclust.cluster import cluster_messages
from rpkclust.metrics import evaluate_clusters_against_messages

# Stage ids in execution order; a failure marks every later stage "skipped".
STAGE_IDS = ["boundary", "tagging", "candidates", "stage1", "stage2", "cluster", "metrics"]


def run_pipeline(
    trace_or_messages: Any,
    config: Optional[Config] = None,
    output_dir: Optional[str] = None,
    capture: bool = False
) -> Result:
    """
    Run the full RPKClust protocol reverse engineering pipeline.

    When capture=True, intermediates are stored in Result.trace (a
    PipelineCapture) and a failing stage is recorded in capture.errors with
    downstream stages skipped, returning a partial capture. When capture=False
    (default) the behavior is byte-identical to the original implementation:
    exceptions propagate as before.
    """
    t0 = time.perf_counter()

    if config is None:
        config = Config()

    if isinstance(trace_or_messages, Trace):
        messages = trace_or_messages.messages
        pairs = trace_or_messages.pairs
        capture_range = trace_or_messages.capture_range
    elif isinstance(trace_or_messages, list):
        messages = trace_or_messages
        pairs = []
        capture_range = (
            min((m.ts for m in messages), default=0.0),
            max((m.ts for m in messages), default=0.0),
        )
    else:
        raise ValueError("Input must be Trace or List[Message]")

    timings: Dict[str, float] = {}
    errors: Dict[str, str] = {}

    def run_stage(stage_id: str, fn, *args, **kwargs):
        """Run one pipeline stage. With capture=False exceptions propagate
        unchanged; with capture=True they are recorded and None is returned."""
        ts = time.perf_counter()
        try:
            res = fn(*args, **kwargs)
        except Exception:
            if not capture:
                raise
            errors[stage_id] = traceback.format_exc()
            return None
        dt = time.perf_counter() - ts
        timings[stage_id] = timings.get(stage_id, 0.0) + dt
        return res

    # 1. FOR-NFOR Boundary Detection (Algorithm 1)
    boundary = run_stage(
        "boundary", find_boundary, messages=messages, config=config, pairs=pairs
    )

    # 2. Semantic tagging + Candidate Generation (Algorithm 2 & Algorithm 3)
    tag_hits: Optional[List[Any]] = None
    cand_boundary: Optional[BoundaryResult] = None
    candidates: List[Candidate] = []
    cand_diagnostics: Dict[str, Any] = {}

    if boundary is not None:
        from rpkclust.detectors.registry import all_hits, EXTRA_RULES

        # Spec (05): a position can match several rules; keep ALL tags for candidate
        # filtering. B itself still comes from the first-match boundary scan.
        tag_hits = run_stage(
            "tagging", all_hits, messages, config,
            max_offset=boundary.B, pairs=pairs,
            detectors=BOUNDARY_RULES + EXTRA_RULES,
        )
        if tag_hits is not None:
            cand_boundary = BoundaryResult(
                B=boundary.B, hits=tag_hits,
                min_len=boundary.min_len, direction=boundary.direction,
            )
            gen = run_stage(
                "candidates", generate_candidates,
                messages=messages, boundary=cand_boundary, config=config,
            )
            if gen is not None:
                candidates, cand_diagnostics = gen

    # 3. Two-Stage Probability Inference (per direction)
    keywords: Dict[str, Optional[KeywordResult]] = {}
    stage1_results: Dict[str, Any] = {}
    stage2_results: Dict[str, Any] = {}

    directions_to_run = ["c2s", "s2c"]
    # Check if there are messages for both directions
    present_dirs = {m.direction for m in messages}
    if "c2s" not in present_dirs and "s2c" not in present_dirs:
        directions_to_run = ["both"]

    inference_complete = False
    if cand_boundary is not None:
        for d in directions_to_run:
            s1 = run_stage(
                "stage1", evaluate_stage1,
                messages=messages, candidates=candidates,
                boundary_b=boundary.B, config=config, pairs=pairs, direction=d,
            )
            if s1 is None:
                break
            stage1_results[d] = s1

            kw = run_stage(
                "stage2", evaluate_stage2,
                messages=messages, stage1_result=s1, config=config, direction=d,
            )
            if kw is None:
                break
            stage2_results[d] = kw
            keywords[d] = kw
        else:
            inference_complete = True

    # 4. Final Message Clustering
    clusters: Dict[int, str] = {}
    metrics: Tuple[Optional[float], Optional[float], Optional[float]] = (None, None, None)
    if inference_complete:
        clusters = run_stage("cluster", cluster_messages, messages, keywords)
        metrics = run_stage(
            "metrics", evaluate_clusters_against_messages, messages, clusters
        )

    total_time = time.perf_counter() - t0
    timings["total"] = total_time

    h, c, v = metrics

    diagnostics: Dict[str, Any] = {
        "timing": {
            "total_sec": total_time,
            "boundary_sec": timings.get("boundary", 0.0),
            "tagging_sec": timings.get("tagging", 0.0),
            # Backward-compatible combined view (tagging + candidate generation)
            "candidates_sec": timings.get("tagging", 0.0) + timings.get("candidates", 0.0),
            "candidates_gen_sec": timings.get("candidates", 0.0),
            "stage1_sec": timings.get("stage1", 0.0),
            "stage2_sec": timings.get("stage2", 0.0),
            "inference_sec": timings.get("stage1", 0.0) + timings.get("stage2", 0.0),
            "cluster_sec": timings.get("cluster", 0.0),
            "metrics_sec": timings.get("metrics", 0.0),
        },
        "boundary_b": boundary.B if boundary is not None else 0,
        "min_len": boundary.min_len if boundary is not None else 0,
        "hits_count": len(boundary.hits) if boundary is not None else 0,
        "candidates_count": len(candidates),
        "metrics": {
            "homogeneity": h,
            "completeness": c,
            "v_measure": v,
        },
        "cand_diagnostics": cand_diagnostics,
        "directions": directions_to_run,
    }

    capture_obj: Optional[PipelineCapture] = None
    if capture:
        capture_obj = PipelineCapture(
            messages=messages,
            pairs=pairs,
            capture_range=capture_range,
            boundary=boundary,
            tag_hits=tag_hits if tag_hits is not None else [],
            cand_boundary=cand_boundary,
            candidates=candidates,
            cand_diagnostics=cand_diagnostics,
            stage1=stage1_results,
            stage2=stage2_results,
            clusters=clusters,
            metrics=metrics,
            timing=timings,
            errors=errors,
        )

    result = Result(
        boundary=boundary,  # type: ignore[arg-type]  # None only when capture=True and the stage failed
        candidates=candidates,
        keywords=keywords,
        clusters=clusters,
        diagnostics=diagnostics,
        trace=capture_obj,
    )

    # Export intermediate JSON artifacts if output_dir provided
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        # 1. Boundary artifact
        with open(os.path.join(output_dir, "03_boundary.json"), "w", encoding="utf-8") as f:
            json.dump({
                "B": boundary.B if boundary is not None else 0,
                "min_len": boundary.min_len if boundary is not None else 0,
                "hits": [
                    {"rule": h.rule, "offset": h.offset, "length": h.length, "info": h.info}
                    for h in (boundary.hits if boundary is not None else [])
                ]
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
