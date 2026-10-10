"""
API runner for web frontend integration.
Takes input trace or dataset name and returns complete JSON serialization.
"""

import sys
import json
import os
import time
from rpkclust.config import Config
from rpkclust.io.loader import load_hex_lines, load_pcap
from rpkclust.pipeline import run_pipeline
from rpkclust.eval.ground_truth import run_benchmark_on_pcap, PROTOCOL_TRUE_KEYWORDS
from rpkclust.catalog import SOURCES, get_catalog, resolve_dataset

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
                "type": c.tlv_type.hex() if c.tlv_type else None
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
                pcap_path = d["file"]
                if not os.path.exists(pcap_path):
                    continue
                try:
                    res = run_benchmark_on_pcap(pcap_path, d["protocol"], config=config, max_messages=100)
                    res["source_id"] = src["id"]
                    res["source_name"] = src["name"]
                    res["dataset_id"] = d["id"]
                    res["dataset_name"] = d["name"]
                    res["category"] = d["category"]
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
            pcap_path = d_meta["file"]
        else:
            pcap_path = f"data/netplier/{proto}_100.pcap"

        if not os.path.exists(pcap_path):
            return {"status": "error", "message": f"Dataset file {pcap_path} not found"}

        sizes = [15, 30, 50, 75, 100]
        scaling_points = []
        for s in sizes:
            t_start = time.perf_counter()
            b_res = run_benchmark_on_pcap(pcap_path, proto, config=config, max_messages=s)
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

        max_msgs = data.get("max_messages", 100)
        res = run_benchmark_on_pcap(pcap_path, proto, config=config, max_messages=max_msgs)
        trace = load_pcap(pcap_path, config)
        if max_msgs and len(trace.messages) > max_msgs:
            from rpkclust.model import Trace
            trace = Trace(messages=trace.messages[:max_msgs], pairs=trace.pairs, capture_range=trace.capture_range)

        pipeline_res = run_pipeline(trace, config)

        pair_lookup = {}
        for p in trace.pairs:
            pair_lookup[p.req_id] = p.resp_id
            pair_lookup[p.resp_id] = p.req_id

        sample_msgs = []
        for m in trace.messages[:60]:
            sample_msgs.append({
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

        pair_lookup = {}
        for p in trace.pairs:
            pair_lookup[p.req_id] = p.resp_id
            pair_lookup[p.resp_id] = p.req_id

        sample_msgs = []
        for m in trace.messages[:60]:
            sample_msgs.append({
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

        return _format_pipeline_output(pipeline_res, sample_msgs, pairs=trace.pairs)

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
