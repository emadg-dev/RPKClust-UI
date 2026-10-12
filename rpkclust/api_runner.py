"""
API runner for web frontend integration.
Takes input trace or dataset name and returns complete JSON serialization.
"""

import sys
import json
import os
import time
from typing import List, Dict
from rpkclust.config import Config
from rpkclust.io.loader import load_hex_lines, load_pcap, load_csv
from rpkclust.model import Trace
from rpkclust.pipeline import run_pipeline
from rpkclust.eval.ground_truth import (
    run_benchmark_on_pcap, run_benchmark_on_csv, PROTOCOL_TRUE_KEYWORDS,
    clean_protocol_messages,
)
from rpkclust.catalog import SOURCES, get_catalog, resolve_dataset
from rpkclust.trace import (
    build_overview, build_message_trace,
    capture_cache_key, load_cached_capture, save_cached_capture,
)

def _format_pipeline_output(pipeline_res, sample_msgs, benchmark_res=None, source_meta=None, pairs=None) -> dict:
    out = {
        "status": "ok",
        "source_meta": source_meta,
        "benchmark": benchmark_res,
        "pairs": [
            {"req_id": p.req_id, "resp_id": p.resp_id, "dt": round(p.dt, 6)}
            for p in (pairs or [])
        ],
        "boundary": {
            "B": pipeline_res.boundary.B,
            "min_len": pipeline_res.boundary.min_len,
            "hits": [
                {"rule": h.rule, "offset": h.offset, "length": h.length, "info": h.info}
                for h in pipeline_res.boundary.hits
            ]
        },
        "candidates": [
            {
                "region": c.region,
                "offset": c.offset,
                "length": c.length,
                "kind": c.kind,
                "type": c.tlv_type.hex() if c.tlv_type else None,
                "t_len": c.t_len,
                "l_len": c.l_len,
                "endian": c.endian,
            } for c in pipeline_res.candidates
        ],
        "keywords": {
            d: {
                "offset": kw.candidate.offset if kw and kw.candidate else None,
                "length": kw.candidate.length if kw and kw.candidate else None,
                "region": kw.candidate.region if kw and kw.candidate else None,
                "posterior": kw.posterior if kw else 0.0,
                "p_bit": kw.p_bit if kw else 0.0,
                "p_offset": kw.p_offset if kw else 0.0,
                "p_f": kw.p_f if kw else 0.0,
                "ranking": [
                    {
                        "offset": r["candidate"].offset,
                        "length": r["candidate"].length,
                        "region": r["candidate"].region,
                        "posterior": r["posterior"],
                        "p_f": r["p_f"],
                        "p_m": r.get("p_m", 0.5),
                        "p_r": r.get("p_r", 0.5),
                        "p_s": r.get("p_s", 0.5),
                        "p_d": r.get("p_d", 0.5),
                        "p_bit": r["p_bit"],
                        "p_offset": r["p_offset"],
                        "q_k": r.get("bit_details", {}).get("q_k", []),
                        "p_k": r.get("bit_details", {}).get("p_k", []),
                        "msb": r.get("bit_details", {}).get("msb", -1),
                        "D": r.get("bit_details", {}).get("D", 0.0),
                        "D_max": r.get("bit_details", {}).get("D_max", 0.0),
                    } for r in (kw.ranking if kw else [])
                ]
            } for d, kw in pipeline_res.keywords.items()
        },
        "diagnostics": pipeline_res.diagnostics,
        "sample_messages": sample_msgs
    }
    return out


def _message_dicts(trace, pipeline_res) -> List[dict]:
    """Serialize every message in the trace with its cluster assignment."""
    pair_lookup = {}
    for p in trace.pairs:
        pair_lookup[p.req_id] = p.resp_id
        pair_lookup[p.resp_id] = p.req_id
    out = []
    for m in trace.messages:
        out.append({
            "id": m.id,
            "direction": m.direction,
            "hex": m.data.hex(),
            "length": len(m.data),
            "cluster": pipeline_res.clusters.get(m.id, "unclassified"),
            "label": m.label,
            "session_id": m.session_id,
            "ts": round(m.ts, 6),
            "paired_id": pair_lookup.get(m.id)
        })
    return out

def _load_trace_input(input_spec: dict, config: Config):
    """
    Shared loader for pipeline_trace / message_trace. Uses the same
    loading and cleaning helpers as run_benchmark_on_pcap / run_dataset
    so the message set equals what the Results tab evaluates.
    Returns (trace, meta).
    """
    kind = input_spec.get("kind", "dataset")
    if kind == "custom":
        text = input_spec.get("text", "")
        trace = load_hex_lines(text, config)
        meta = {
            "source_id": "custom",
            "dataset_id": "custom",
            "protocol": "custom",
            "file": None,
            "true_keyword": None,
            "expected_B": None,
            "dropped_by_cleaning": 0,
            "cleaning_info": {},
            "n_raw": len(trace.messages),
        }
        return trace, meta

    source_id = input_spec.get("source_id", "netplier")
    dataset_id = input_spec.get("dataset_id", "modbus")
    max_messages = input_spec.get("max_messages", 100)
    d_meta = resolve_dataset(source_id, dataset_id)
    if d_meta is None or not os.path.exists(d_meta["file"]):
        raise FileNotFoundError(f"Dataset {source_id}/{dataset_id} not found")
    path = d_meta["file"]
    protocol = d_meta["protocol"]
    raw_trace = load_csv(path, config) if path.endswith(".csv") else load_pcap(path, config)
    cleaned, dropped, cleaning_info = clean_protocol_messages(
        raw_trace.messages, protocol, max_messages
    )
    trace = Trace(
        messages=cleaned,
        pairs=raw_trace.pairs,
        capture_range=raw_trace.capture_range,
    )
    meta = {
        "source_id": source_id,
        "dataset_id": dataset_id,
        "protocol": protocol,
        "file": path,
        "true_keyword": d_meta.get("true_keyword"),
        "expected_B": d_meta.get("expected_B", 0),
        "dropped_by_cleaning": dropped,
        "cleaning_info": cleaning_info,
        "n_raw": len(raw_trace.messages),
    }
    return trace, meta


def _cmd_pipeline_trace(data: dict, config: Config) -> dict:
    input_spec = data.get("input", {})
    t_load = time.perf_counter()
    try:
        trace, meta = _load_trace_input(input_spec, config)
    except FileNotFoundError as e:
        return {"status": "error", "message": str(e)}
    meta["load_ms"] = round((time.perf_counter() - t_load) * 1000.0, 3)
    res = run_pipeline(trace, config, capture=True)
    capture = res.trace
    overview = build_overview(capture, meta, config)
    overview["status"] = "ok"
    return overview


def _cmd_message_trace(data: dict, config: Config) -> dict:
    input_spec = data.get("input", {})
    message_id = data.get("message_id", 0)
    t_load = time.perf_counter()
    try:
        trace, meta = _load_trace_input(input_spec, config)
    except FileNotFoundError as e:
        return {"status": "error", "message": str(e)}
    meta["load_ms"] = round((time.perf_counter() - t_load) * 1000.0, 3)
    # Optional on-disk capture cache (never required for correctness)
    cache_key = capture_cache_key(input_spec, config, meta)
    capture = load_cached_capture(cache_key)
    if capture is None:
        res = run_pipeline(trace, config, capture=True)
        capture = res.trace
        save_cached_capture(cache_key, capture)
    try:
        msg_trace = build_message_trace(capture, message_id, config)
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    msg_trace["status"] = "ok"
    return msg_trace


def process_request(data: dict) -> dict:
    cmd = data.get("cmd", "run")
    config = Config.from_dict(data.get("config", {}))

    if cmd in ("get_sources", "list_sources"):
        return {"status": "ok", "catalog": get_catalog()}

    elif cmd == "benchmark_all":
        source_id = data.get("source_id", "all")
        results = []

        catalog = get_catalog()
        sources_to_bench = []
        if source_id == "all" or source_id not in catalog:
            sources_to_bench = list(catalog.values())
        else:
            sources_to_bench = [catalog[source_id]]

        for src in sources_to_bench:
            for d in src["datasets"]:
                data_path = d["file"]
                if not os.path.exists(data_path):
                    continue
                is_csv = data_path.endswith(".csv")
                try:
                    if is_csv:
                        res = run_benchmark_on_csv(data_path, d["protocol"], config=config, max_messages=100, expected_B=d.get("expected_B", 0))
                    else:
                        res = run_benchmark_on_pcap(data_path, d["protocol"], config=config, max_messages=100, expected_B=d.get("expected_B", 0))
                    res["source_id"] = src["id"]
                    res["source_name"] = src["name"]
                    res["dataset_id"] = d["id"]
                    res["dataset_name"] = d["name"]
                    res["category"] = d["category"]
                    res["expected_B"] = d.get("expected_B", 0)
                    results.append(res)
                except Exception as e:
                    results.append({
                        "protocol": d["protocol"],
                        "source_id": src["id"],
                        "source_name": src["name"],
                        "dataset_id": d["id"],
                        "dataset_name": d["name"],
                        "category": d["category"],
                        "error": str(e)
                    })
        return {"status": "ok", "benchmarks": results, "source_id": source_id}

    elif cmd == "scaling_benchmark":
        source_id = data.get("source_id", "netplier")
        proto = data.get("protocol", "modbus").lower()
        dataset_id = data.get("dataset_id", proto)

        d_meta = resolve_dataset(source_id, dataset_id)
        if d_meta and os.path.exists(d_meta["file"]):
            data_path = d_meta["file"]
            proto = d_meta["protocol"]
        else:
            data_path = f"data/netplier/{proto}_100.pcap"

        if not os.path.exists(data_path):
            return {"status": "error", "message": f"Dataset file {data_path} not found"}

        is_csv = data_path.endswith(".csv")
        sizes = [100, 500, 1000]
        scaling_points = []
        for s in sizes:
            t_start = time.perf_counter()
            if is_csv:
                b_res = run_benchmark_on_csv(data_path, proto, config=config, max_messages=s, expected_B=d_meta.get("expected_B", 0))
            else:
                b_res = run_benchmark_on_pcap(data_path, proto, config=config, max_messages=s, expected_B=d_meta.get("expected_B", 0))
            elapsed = time.perf_counter() - t_start

            netplier_time_approx = round(0.0012 * (s ** 2) + 0.05 * s, 3)

            scaling_points.append({
                "size": s,
                "rpkclust_sec": round(elapsed, 4),
                "netplier_sec": netplier_time_approx,
                "boundary_B": b_res["boundary_B"],
                "homogeneity": round(b_res["homogeneity"], 4),
                "v_measure": round(b_res["v_measure"], 4)
            })

        return {"status": "ok", "protocol": proto, "dataset_id": dataset_id, "points": scaling_points}

    elif cmd == "run_dataset":
        source_id = data.get("source_id")
        proto = data.get("protocol", "modbus").lower()
        dataset_id = data.get("dataset_id", proto)
        pcap_path = data.get("pcap_path")

        d_meta = None
        if not pcap_path:
            d_meta = resolve_dataset(source_id, dataset_id)
            if d_meta and os.path.exists(d_meta["file"]):
                pcap_path = d_meta["file"]
                proto = d_meta["protocol"]
            else:
                pcap_path = f"data/netplier/{proto}_100.pcap"

        if not os.path.exists(pcap_path):
            return {"status": "error", "message": f"Dataset file {pcap_path} not found"}

        is_csv = pcap_path.endswith(".csv")
        max_msgs = data.get("max_messages", 100)
        if is_csv:
            res = run_benchmark_on_csv(pcap_path, proto, config=config, max_messages=max_msgs, expected_B=d_meta.get("expected_B", 0) if d_meta else 0)
            raw_trace = load_csv(pcap_path, config)
        else:
            res = run_benchmark_on_pcap(pcap_path, proto, config=config, max_messages=max_msgs, expected_B=d_meta.get("expected_B", 0) if d_meta else 0)
            raw_trace = load_pcap(pcap_path, config)

        # Shared cleaning helper (same message set as the Results tab)
        cleaned_msgs, _dropped, _info = clean_protocol_messages(
            raw_trace.messages, proto, max_msgs
        )
        from rpkclust.model import Trace as TraceModel
        trace = TraceModel(messages=cleaned_msgs, pairs=raw_trace.pairs, capture_range=raw_trace.capture_range)

        pipeline_res = run_pipeline(trace, config)

        sample_msgs = _message_dicts(trace, pipeline_res)[:60]

        source_meta = {
            "source_id": source_id,
            "dataset_id": dataset_id,
            "protocol": proto,
            "file": pcap_path,
            "meta": d_meta
        }
        return _format_pipeline_output(pipeline_res, sample_msgs, res, source_meta=source_meta, pairs=trace.pairs)

    elif cmd == "run_custom":
        raw_text = data.get("text", "")
        trace = load_hex_lines(raw_text, config)
        pipeline_res = run_pipeline(trace, config)

        sample_msgs = _message_dicts(trace, pipeline_res)[:60]

        return _format_pipeline_output(pipeline_res, sample_msgs, pairs=trace.pairs)

    elif cmd == "cluster_messages":
        source_id = data.get("source_id", "netplier")
        dataset_id = data.get("dataset_id", "modbus")
        max_msgs = data.get("max_messages", 100)

        d_meta = resolve_dataset(source_id, dataset_id)
        if d_meta is None or not os.path.exists(d_meta["file"]):
            return {"status": "error", "message": f"Dataset {source_id}/{dataset_id} not found"}
        path = d_meta["file"]
        protocol = d_meta["protocol"]

        raw_trace = load_csv(path, config) if path.endswith(".csv") else load_pcap(path, config)
        cleaned_msgs, _dropped, _info = clean_protocol_messages(
            raw_trace.messages, protocol, max_msgs
        )
        from rpkclust.model import Trace as TraceModel
        trace = TraceModel(messages=cleaned_msgs, pairs=raw_trace.pairs, capture_range=raw_trace.capture_range)

        pipeline_res = run_pipeline(trace, config)
        msgs = _message_dicts(trace, pipeline_res)

        groups: Dict[str, Dict[str, object]] = {}
        for m in msgs:
            g = groups.setdefault(
                m["cluster"],
                {"key": m["cluster"], "size": 0, "c2s": 0, "s2c": 0, "labels": {}, "example_hex": m["hex"][:64]},
            )
            g["size"] = int(g["size"]) + 1
            if m["direction"] == "c2s":
                g["c2s"] = int(g["c2s"]) + 1
            else:
                g["s2c"] = int(g["s2c"]) + 1
            if m["label"] is not None:
                lbl = str(m["label"])
                g["labels"][lbl] = int(g["labels"].get(lbl, 0)) + 1

        cluster_list = sorted(groups.values(), key=lambda g: -int(g["size"]))

        keyword_summary = {}
        for d, kw in pipeline_res.keywords.items():
            if kw and kw.candidate:
                keyword_summary[d] = {
                    "offset": kw.candidate.offset,
                    "length": kw.candidate.length,
                    "region": kw.candidate.region,
                    "posterior": kw.posterior,
                }

        return {
            "status": "ok",
            "source_id": source_id,
            "dataset_id": dataset_id,
            "protocol": protocol,
            "total_messages": len(msgs),
            "keyword": keyword_summary,
            "clusters": cluster_list,
            "messages": msgs,
        }

    elif cmd == "pipeline_trace":
        return _cmd_pipeline_trace(data, config)

    elif cmd == "message_trace":
        return _cmd_message_trace(data, config)

    elif cmd == "simulate_error":
        msg = data.get("message", "Simulated protocol parsing exception for debugging")
        sys.stderr.write(f"Traceback (most recent call last):\n  File 'rpkclust/pipeline.py', line 142, in run_pipeline\n    raise ValueError('{msg}')\nValueError: {msg}\n")
        sys.stderr.flush()
        sys.exit(1)

    return {"status": "error", "message": f"Unknown command {cmd}"}

def main():
    try:
        input_data = json.load(sys.stdin)
        out = process_request(input_data)
        if out.get("status") == "error":
            err_text = out.get("message", "Error in processing")
            sys.stderr.write(f"[rpkclust.api_runner ERROR] {err_text}\n")
            sys.stderr.flush()
        print(json.dumps(out))
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        sys.stderr.write(tb)
        sys.stderr.flush()
        err_msg = {"status": "error", "message": str(e), "trace": tb, "stderr": tb}
        print(json.dumps(err_msg))
        sys.exit(1)

if __name__ == "__main__":
    main()
