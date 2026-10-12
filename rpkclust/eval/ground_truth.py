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
    "ntp48": {"offset": 0, "length": 1, "bits": (5, 7), "name": "Mode (bits 5-7)"},
    "dhcp": {"offset": 242, "length": 1, "region": "FOR", "name": "DHCP Message Type (Option 53)"},
    "tftp": {"offset": 0, "length": 2, "region": "FOR", "name": "Opcode (RRQ/WRQ/DATA/ACK)"},
    "smb": {"offset": 8, "length": 1, "region": "FOR", "name": "SMB Command"},
    "smb2": {"offset": 16, "length": 2, "region": "FOR", "name": "SMB2 Command"},
    "bgp": {"offset": 18, "length": 1, "region": "FOR", "name": "BGP Message Type"},
    "mavlink": {"offset": 5, "length": 1, "region": "FOR", "name": "MAVLink Message ID (v1)"},
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
        elif p in ("ntp", "ntp48"):
            if len(data) > 0:
                return str(data[0] & 0x07)
        elif p in ("smb",):
            base = 0 if data[0:4] == b"\xffSMB" else 4
            if len(data) > base + 4:
                return data[base + 4:base + 5].hex()
        elif p == "smb2":
            base = 0 if data[0:4] == b"\xfeSMB" else 4
            if len(data) > base + 13:
                return data[base + 12:base + 14].hex()
        elif p in ("tftp",):
            if len(data) >= 2:
                return data[0:2].hex()
        elif p == "bgp":
            if len(data) > 18:
                return data[18:19].hex()
        elif p == "mavlink":
            # MAVLink v1: message ID at offset 5 (1 byte)
            # MAVLink v2: message ID at offset 5-7 (3 bytes, little-endian)
            if len(data) > 5:
                return data[5:6].hex()  # v1 message ID
    except Exception:
        return None
    return None


def clean_protocol_messages(
    messages: List[Message],
    protocol: str,
    max_messages: Optional[int] = None
) -> Tuple[List[Message], int, Dict[str, int]]:
    """
    Shared protocol cleaning: modbus length truncation, smb/smb2 magic filter
    and ground-truth label extraction. Single source of truth used by
    run_benchmark_on_pcap, run_benchmark_on_csv, api_runner (run_dataset,
    pipeline_trace, message_trace) so every path sees the same message set.

    Returns (cleaned_messages, dropped_count, info) where info breaks the
    drops/truncations down by cause (display only).
    """

    p = protocol.lower()
    cleaned_msgs: List[Message] = []
    dropped = 0
    info = {"modbus_truncated": 0, "smb_filtered": 0, "smb2_filtered": 0}
    for m in messages:
        data = m.data
        if p == "modbus":
            if len(data) >= 6:
                length = int.from_bytes(data[4:6], byteorder="big", signed=False)
                if len(data) > length + 6:
                    data = data[:length + 6]
                    info["modbus_truncated"] += 1
        elif p == "smb":
            # Accept with (base=4) or without (base=0) NetBIOS header
            if not (len(data) >= 4 and data[0:4] == b"\xffSMB") and \
               not (len(data) >= 8 and data[4:8] == b"\xffSMB"):
                dropped += 1
                info["smb_filtered"] += 1
                continue
        elif p == "smb2":
            if not (len(data) >= 4 and data[0:4] == b"\xfeSMB") and \
               not (len(data) >= 8 and data[4:8] == b"\xfeSMB"):
                dropped += 1
                info["smb2_filtered"] += 1
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

    return cleaned_msgs, dropped, info


def run_benchmark_on_pcap(
    pcap_file: str,
    protocol: str,
    config: Optional[Config] = None,
    max_messages: Optional[int] = None,
    expected_B: Optional[int] = None
) -> Dict[str, any]:
    """
    Execute RPKClust on a PCAP dataset and evaluate metrics against ground truth.
    """
    if config is None:
        config = Config()

    trace = load_pcap(pcap_file, config)
    messages = trace.messages

    # Filter protocol-specific headers (shared cleaning helper)
    cleaned_msgs, _dropped, _info = clean_protocol_messages(
        messages, protocol, max_messages
    )

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

    true_spec = PROTOCOL_TRUE_KEYWORDS.get(protocol.lower(), {})
    if not true_spec:
        for k, v in PROTOCOL_TRUE_KEYWORDS.items():
            if k in protocol.lower() or protocol.lower() in k:
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
        "timing_sec": res.diagnostics["timing"]["total_sec"],
        "expected_B": expected_B if expected_B is not None else 0
    }


def run_benchmark_on_csv(
    csv_path: str,
    protocol: str,
    config: Optional[Config] = None,
    max_messages: Optional[int] = None,
    expected_B: Optional[int] = None
) -> Dict[str, any]:
    """
    Execute RPKClust on a CNN-pre CSV dataset and evaluate metrics against ground truth.
    Uses load_csv to parse the file, then runs the standard pipeline + evaluation.
    """
    if config is None:
        config = Config()

    trace = load_csv(csv_path, config)
    messages = trace.messages

    # Shared cleaning helper (label extraction + protocol filters)
    cleaned_msgs, _dropped, _info = clean_protocol_messages(
        messages, protocol, max_messages
    )

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

    true_spec = PROTOCOL_TRUE_KEYWORDS.get(protocol.lower(), {})
    if not true_spec:
        for k, v in PROTOCOL_TRUE_KEYWORDS.items():
            if k in protocol.lower() or protocol.lower() in k:
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
        "timing_sec": res.diagnostics["timing"]["total_sec"],
        "expected_B": expected_B if expected_B is not None else 0
    }
