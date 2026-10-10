"""
Ground-truth extractors and benchmark runner for NetPlier / RPKClust datasets.
Matches the official definitions from NetPlier and RPKClust publications.
"""

import os
import struct
from typing import List, Dict, Tuple, Optional
from rpkclust.model import Message, Trace
from rpkclust.config import Config
from rpkclust.io.loader import load_pcap, load_csv
from rpkclust.pipeline import run_pipeline
from rpkclust.metrics import compute_metrics

PROTOCOL_TRUE_KEYWORDS = {
    "dnp3": {"offset": 12, "length": 1, "region": "FOR", "name": "Application Function Code"},
    "modbus": {"offset": 7, "length": 1, "region": "FOR", "name": "Function Code"},
    "ntp": {"offset": 0, "length": 1, "bits": (5, 7), "name": "Mode (bits 5-7)"},
    "dhcp": {"offset": 242, "length": 1, "region": "FOR", "name": "DHCP Message Type (Option 53)"},
    "tftp": {"offset": 0, "length": 2, "region": "FOR", "name": "Opcode (RRQ/WRQ/DATA/ACK)"},
    "smb": {"offset": 8, "length": 1, "region": "FOR", "name": "SMB Command"},
    "smb2": {"offset": 16, "length": 2, "region": "FOR", "name": "SMB2 Command"},
}

def extract_ground_truth_label(protocol: str, data: bytes) -> Optional[str]:
    """
    Extract true keyword label according to protocol specification (matching NetPlier processing.py).
    """
    p = protocol.lower()
    try:
        if p in ("dhcp",):
            if len(data) > 242:
                return data[242:243].hex()
        elif p in ("dnp3",):
            if len(data) > 12:
                return data[12:13].hex()
        elif p in ("modbus",):
            if len(data) > 7:
                return data[7:8].hex()
        elif p in ("ntp",):
            if len(data) > 0:
                return str(data[0] & 0x07)
        elif p in ("smb",):
            if len(data) > 8:
                return data[8:9].hex()
        elif p == "smb2":
            if len(data) > 18:
                return data[16:18].hex()
        elif p in ("tftp",):
            if len(data) >= 2:
                return data[0:2].hex()
    except Exception:
        return None
    return None


def run_benchmark_on_pcap(
    pcap_file: str,
    protocol: str,
    config: Optional[Config] = None,
    max_messages: Optional[int] = None
) -> Dict[str, any]:
    """
    Execute RPKClust on a PCAP dataset and evaluate metrics against ground truth.
    """
    if config is None:
        config = Config()

    trace = load_pcap(pcap_file, config)
    messages = trace.messages

    # Filter protocol-specific headers if necessary
    p = protocol.lower()
    cleaned_msgs: List[Message] = []
    for m in messages:
        data = m.data
        if p == "modbus":
            if len(data) >= 6:
                length = int.from_bytes(data[4:6], byteorder="big", signed=True)
                if len(data) > length + 6:
                    data = data[:length + 6]
        elif p == "smb":
            if len(data) < 8 or data[4:8] != b"\xffSMB":
                continue
        elif p == "smb2":
            if len(data) < 8 or data[4:8] != b"\xfeSMB":
                continue

        lbl = extract_ground_truth_label(protocol, data)
        cleaned_msgs.append(Message(
            id=len(cleaned_msgs),
            data=data,
            ts=m.ts,
            src=m.src,
            dst=m.dst,
            sport=m.sport,
            dport=m.dport,
            direction=m.direction,
            session_id=m.session_id,
            label=lbl
        ))

    if max_messages and len(cleaned_msgs) > max_messages:
        cleaned_msgs = cleaned_msgs[:max_messages]

    eval_trace = Trace(
        messages=cleaned_msgs,
        pairs=trace.pairs,
        capture_range=trace.capture_range
    )

    res = run_pipeline(eval_trace, config)

    # Evaluate against true labels
    labeled = [m for m in cleaned_msgs if m.label is not None]
    y_true = [f"{m.direction}_{m.label}" for m in labeled]
    y_pred = [res.clusters.get(m.id, "unclassified") for m in labeled]

    h, c, v = compute_metrics(y_true, y_pred) if y_true else (0.0, 0.0, 0.0)

    # Inferred keyword summary
    inferred_keywords = {}
    for d_name, kw in res.keywords.items():
        if kw and kw.candidate:
            cand = kw.candidate
            inferred_keywords[d_name] = {
                "offset": cand.offset,
                "length": cand.length,
                "region": cand.region,
                "posterior": kw.posterior
            }

    true_spec = PROTOCOL_TRUE_KEYWORDS.get(p, {})
    if not true_spec:
        for k, v in PROTOCOL_TRUE_KEYWORDS.items():
            if k in p or p in k:
                true_spec = v
                break

    return {
        "protocol": protocol,
        "pcap": os.path.basename(pcap_file),
        "total_messages": len(cleaned_msgs),
        "boundary_B": res.boundary.B,
        "min_len": res.boundary.min_len,
        "candidate_count": len(res.candidates),
        "true_keyword": true_spec,
        "inferred_keywords": inferred_keywords,
        "homogeneity": h,
        "completeness": c,
        "v_measure": v,
        "timing_sec": res.diagnostics["timing"]["total_sec"]
    }


def run_benchmark_on_csv(
    csv_path: str,
    protocol: str,
    config: Optional[Config] = None,
    max_messages: Optional[int] = None
) -> Dict[str, any]:
    """
    Execute RPKClust on a CNN-pre CSV dataset and evaluate metrics against ground truth.
    Uses load_csv to parse the file, then runs the standard pipeline + evaluation.
    """
    if config is None:
        config = Config()

    trace = load_csv(csv_path, config)
    messages = trace.messages

    p = protocol.lower()
    cleaned_msgs: List[Message] = []
    for m in messages:
        lbl = extract_ground_truth_label(protocol, m.data)
        cleaned_msgs.append(Message(
            id=len(cleaned_msgs),
            data=m.data,
            ts=m.ts,
            src=m.src,
            dst=m.dst,
            sport=m.sport,
            dport=m.dport,
            direction=m.direction,
            session_id=m.session_id,
            label=lbl,
        ))

    if max_messages and len(cleaned_msgs) > max_messages:
        cleaned_msgs = cleaned_msgs[:max_messages]

    eval_trace = Trace(
        messages=cleaned_msgs,
        pairs=trace.pairs,
        capture_range=trace.capture_range
    )

    res = run_pipeline(eval_trace, config)

    labeled = [m for m in cleaned_msgs if m.label is not None]
    y_true = [f"{m.direction}_{m.label}" for m in labeled]
    y_pred = [res.clusters.get(m.id, "unclassified") for m in labeled]

    h, c, v = compute_metrics(y_true, y_pred) if y_true else (0.0, 0.0, 0.0)

    inferred_keywords = {}
    for d_name, kw in res.keywords.items():
        if kw and kw.candidate:
            cand = kw.candidate
            inferred_keywords[d_name] = {
                "offset": cand.offset,
                "length": cand.length,
                "region": cand.region,
                "posterior": kw.posterior
            }

    true_spec = PROTOCOL_TRUE_KEYWORDS.get(p, {})
    if not true_spec:
        for k, v in PROTOCOL_TRUE_KEYWORDS.items():
            if k in p or p in k:
                true_spec = v
                break

    return {
        "protocol": protocol,
        "dataset": os.path.basename(csv_path),
        "total_messages": len(cleaned_msgs),
        "boundary_B": res.boundary.B,
        "min_len": res.boundary.min_len,
        "candidate_count": len(res.candidates),
        "true_keyword": true_spec,
        "inferred_keywords": inferred_keywords,
        "homogeneity": h,
        "completeness": c,
        "v_measure": v,
        "timing_sec": res.diagnostics["timing"]["total_sec"]
    }
