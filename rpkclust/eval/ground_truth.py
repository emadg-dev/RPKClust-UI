"""
Ground-truth extractors and benchmark runner for NetPlier / RPKClust datasets.
Matches the official definitions from NetPlier and RPKClust publications.
"""

import os
import struct
from typing import List, Dict, Tuple, Optional
from rpkclust.model import Message, Trace
from rpkclust.config import Config
from rpkclust.io.loader import load_pcap
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
    "icmp": {"offset": 0, "length": 2, "region": "FOR", "name": "Type & Code"},
    "zeroaccess": {"offset": 0, "length": 4, "region": "FOR", "name": "Command / Magic"},
    "dns": {"offset": 2, "length": 1, "region": "FOR", "name": "QR / Opcode Flags"},
    "nbns": {"offset": 2, "length": 1, "region": "FOR", "name": "Opcode / Flags"},
    "iec104": {"offset": 6, "length": 1, "region": "FOR", "name": "ASDU Type Identification (TI)"},
    "bacnet": {"offset": 1, "length": 1, "region": "FOR", "name": "BVLC Function"},
    "mavlink": {"offset": 5, "length": 1, "region": "FOR", "name": "Message ID (msgid)"},
    "binaryprotocols_merged": {"offset": 0, "length": 2, "region": "FOR", "name": "Protocol Signature"},
}

def extract_ground_truth_label(protocol: str, data: bytes) -> Optional[str]:
    """
    Extract true keyword label according to protocol specification (matching NetPlier processing.py).
    """
    p = protocol.lower()
    try:
        if p in ("dhcp", "dhcp_smia", "dhcp_wireshark"):
            if len(data) > 242:
                return data[242:243].hex()
        elif p in ("dnp3", "dnp3_read_resp", "dnp3_select_operate"):
            if len(data) > 12:
                return data[12:13].hex()
        elif p in ("modbus", "modbus_mb2", "modbus_tcp"):
            if len(data) > 7:
                return data[7:8].hex()
        elif p in ("ntp", "ntp_smia"):
            if len(data) > 0:
                # Mode in byte 0
                return str(data[0] & 0x07)
        elif p in ("smb", "smb_smia"):
            if len(data) > 8:
                return data[8:9].hex()
        elif p == "smb2":
            if len(data) > 18:
                return data[16:18].hex()
        elif p in ("tftp", "tftp_rrq", "tftp_wrq"):
            if len(data) >= 2:
                return data[0:2].hex()
        elif p == "icmp":
            if len(data) >= 2:
                return data[0:2].hex()
        elif p == "zeroaccess":
            if len(data) >= 4:
                return data[0:4].hex()
        elif p == "dns":
            if len(data) >= 3:
                return data[2:3].hex()
        elif p == "nbns":
            if len(data) >= 3:
                return data[2:3].hex()
        elif p in ("iec104", "iec104_dissect", "iec104_diverse"):
            if len(data) >= 7:
                return data[6:7].hex()
            elif len(data) >= 2:
                return "s_u_ctrl"
        elif p == "bacnet":
            if len(data) >= 2:
                return data[1:2].hex()
        elif p == "mavlink":
            if len(data) >= 6:
                return data[5:6].hex()
        elif "merged" in p:
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
                # Modbus TCP length field at 4:6
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
