"""
Datasets and Sources catalog for RPKClust.
Organizes PCAPs from NetPlier benchmark and Real ICS Traffic sources,
covering 7 supported protocols (Modbus, DNP3, DHCP, TFTP, NTP, SMB, SMB2).
"""

import os
from typing import Dict, List, Any, Optional

SOURCES = {
    "netplier": {
        "id": "netplier",
        "name": "NetPlier Official Benchmark",
        "short_name": "NetPlier",
        "citation": "Ye et al., IEEE S&P / USENIX Sec",
        "url": "https://github.com/yapengye/NetPlier/tree/master/data",
        "badge": "Official Benchmark",
        "color": "indigo",
        "description": "The official benchmark dataset from the NetPlier repository, covering the 7 supported protocols (Modbus, DNP3, DHCP, TFTP, NTP, SMB, SMB2).",
        "datasets": [
            {
                "id": "modbus",
                "name": "Modbus TCP",
                "protocol": "modbus",
                "file": "data/netplier/modbus_100.pcap",
                "category": "SCADA / Industrial",
                "packets": 100,
                "header_len": 8,
                "keyword_field": "Function Code (offset 7, 1B)",
                "true_keyword": {"offset": 7, "length": 1, "region": "FOR", "name": "Function Code"},
                "expected_B": 8,
                "description": "Standard Modbus TCP request/response frames querying holding registers and coils."
            },
            {
                "id": "dnp3",
                "name": "DNP3 SCADA",
                "protocol": "dnp3",
                "file": "data/netplier/dnp3_100.pcap",
                "category": "Electric Utility SCADA",
                "packets": 114,
                "header_len": 13,
                "keyword_field": "Application Function Code (offset 12, 1B)",
                "true_keyword": {"offset": 12, "length": 1, "region": "FOR", "name": "Application Function Code"},
                "expected_B": 13,
                "description": "Distributed Network Protocol 3 telemetry and control between master and outstation RTUs."
            },
            {
                "id": "dhcp",
                "name": "DHCP (BOOTP)",
                "protocol": "dhcp",
                "file": "data/netplier/dhcp_100.pcap",
                "category": "Network Infrastructure",
                "packets": 100,
                "header_len": 240,
                "keyword_field": "Message Type Option 53 (offset 242, 1B)",
                "true_keyword": {"offset": 242, "length": 1, "region": "FOR", "name": "DHCP Option 53 (Msg Type)"},
                "expected_B": 245,
                "description": "Dynamic Host Configuration Protocol discover/offer/request/ack exchanges."
            },
            {
                "id": "tftp",
                "name": "TFTP",
                "protocol": "tftp",
                "file": "data/netplier/tftp_100.pcap",
                "category": "File Transfer",
                "packets": 100,
                "header_len": 2,
                "keyword_field": "Opcode (offset 0, 2B)",
                "true_keyword": {"offset": 0, "length": 2, "region": "FOR", "name": "Opcode"},
                "expected_B": 2,
                "description": "Trivial File Transfer Protocol RRQ, WRQ, DATA, ACK, and ERROR message packets."
            },
            {
                "id": "ntp",
                "name": "NTP Time Sync",
                "protocol": "ntp",
                "file": "data/netplier/ntp_100.pcap",
                "category": "Time Synchronization",
                "packets": 100,
                "header_len": 48,
                "keyword_field": "Mode (offset 0, bits 5-7)",
                "true_keyword": {"offset": 0, "length": 1, "bits": (5, 7), "name": "Mode (bits 5-7)"},
                "expected_B": 48,
                "description": "Network Time Protocol packets with client, server, and symmetric active synchronization modes."
            },
            {
                "id": "smb",
                "name": "SMBv1",
                "protocol": "smb",
                "file": "data/netplier/smb_100.pcap",
                "category": "Storage / File Sharing",
                "packets": 100,
                "header_len": 32,
                "keyword_field": "SMB Command (offset 8, 1B)",
                "true_keyword": {"offset": 8, "length": 1, "region": "FOR", "name": "SMB Command"},
                "expected_B": 39,
                "description": "Server Message Block version 1 commands (Negotiate, Session Setup, Tree Connect, Trans2)."
            },
            {
                "id": "smb2",
                "name": "SMBv2",
                "protocol": "smb2",
                "file": "data/netplier/smb2_100.pcap",
                "category": "Storage / File Sharing",
                "packets": 100,
                "header_len": 64,
                "keyword_field": "SMB2 Command (offset 16, 2B)",
                "true_keyword": {"offset": 16, "length": 2, "region": "FOR", "name": "SMB2 Command"},
                "expected_B": 70,
                "description": "SMBv2 multi-credit protocol commands including Create, Close, Read, Write, and Ioctl."
            }
        ]
    }
,
    "icsreal": {
        "id": "icsreal",
        "name": "Real ICS Traffic",
        "short_name": "ICS Real",
        "citation": "ICS-Security-Tools",
        "url": "https://github.com/ICS-Security-Tools",
        "badge": "Real ICS",
        "color": "sky",
        "description": "Real ICS protocol captures from the ICS-Security-Tools repository and other public traffic sources, covering all 7 supported protocols with larger, more diverse message volumes.",
        "datasets": [
            {
                "id": "modbus",
                "name": "Modbus TCP (Real)",
                "protocol": "modbus",
                "file": "data/icsreal/modbus.pcap",
                "category": "SCADA / Industrial",
                "packets": 4901,
                "header_len": 8,
                "keyword_field": "Function Code (offset 7, 1B)",
                "true_keyword": {"offset": 7, "length": 1, "region": "FOR", "name": "Function Code"},
                "expected_B": 8,
                "description": "Real Modbus TCP traffic with diverse function codes from ICS-Security-Tools."
            },
            {
                "id": "dnp3",
                "name": "DNP3 SCADA (Real)",
                "protocol": "dnp3",
                "file": "data/icsreal/dnp3.pcap",
                "category": "Electric Utility SCADA",
                "packets": 198,
                "header_len": 13,
                "keyword_field": "Application Function Code (offset 12, 1B)",
                "true_keyword": {"offset": 12, "length": 1, "region": "FOR", "name": "Application Function Code"},
                "expected_B": 13,
                "description": "Real DNP3 telemetry and control traffic between master and outstation RTUs."
            },
            {
                "id": "dhcp",
                "name": "DHCP (Real)",
                "protocol": "dhcp",
                "file": "data/icsreal/dhcp.pcap",
                "category": "Network Infrastructure",
                "packets": 100,
                "header_len": 240,
                "keyword_field": "Message Type Option 53 (offset 242, 1B)",
                "true_keyword": {"offset": 242, "length": 1, "region": "FOR", "name": "DHCP Option 53 (Msg Type)"},
                "expected_B": 245,
                "description": "Real DHCP discover/offer/request/ack exchanges."
            },
            {
                "id": "tftp",
                "name": "TFTP (Real)",
                "protocol": "tftp",
                "file": "data/icsreal/tftp.pcap",
                "category": "File Transfer",
                "packets": 100,
                "header_len": 2,
                "keyword_field": "Opcode (offset 0, 2B)",
                "true_keyword": {"offset": 0, "length": 2, "region": "FOR", "name": "Opcode"},
                "expected_B": 2,
                "description": "Real TFTP RRQ, WRQ, DATA, ACK, and ERROR message packets."
            },
            {
                "id": "ntp",
                "name": "NTP Time Sync (Real)",
                "protocol": "ntp",
                "file": "data/icsreal/ntp.pcap",
                "category": "Time Synchronization",
                "packets": 100,
                "header_len": 48,
                "keyword_field": "Mode (offset 0, bits 5-7)",
                "true_keyword": {"offset": 0, "length": 1, "bits": (5, 7), "name": "Mode (bits 5-7)"},
                "expected_B": 48,
                "description": "Real NTP packets with client, server, and symmetric active synchronization modes."
            },
            {
                "id": "smb",
                "name": "SMBv1 (Real)",
                "protocol": "smb",
                "file": "data/icsreal/smb.pcap",
                "category": "Storage / File Sharing",
                "packets": 100,
                "header_len": 32,
                "keyword_field": "SMB Command (offset 8, 1B)",
                "true_keyword": {"offset": 8, "length": 1, "region": "FOR", "name": "SMB Command"},
                "expected_B": 39,
                "description": "Real SMBv1 commands (Negotiate, Session Setup, Tree Connect, Trans2)."
            },
            {
                "id": "smb2",
                "name": "SMBv2 (Real)",
                "protocol": "smb2",
                "file": "data/icsreal/smb2.pcap",
                "category": "Storage / File Sharing",
                "packets": 100,
                "header_len": 64,
                "keyword_field": "SMB2 Command (offset 16, 2B)",
                "true_keyword": {"offset": 16, "length": 2, "region": "FOR", "name": "SMB2 Command"},
                "expected_B": 70,
                "description": "Real SMBv2 multi-credit protocol commands including Create, Close, Read, Write, and Ioctl."
            }
        ]
    }
}


def get_catalog() -> Dict[str, Any]:
    """Return all sources and their datasets with live file status."""
    catalog = {}
    for src_id, src in SOURCES.items():
        src_copy = dict(src)
        datasets = []
        for d in src["datasets"]:
            d_copy = dict(d)
            file_path = d["file"]
            d_copy["exists"] = os.path.exists(file_path)
            d_copy["file_size_kb"] = round(os.path.getsize(file_path) / 1024, 1) if os.path.exists(file_path) else 0
            datasets.append(d_copy)
        src_copy["datasets"] = datasets
        catalog[src_id] = src_copy
    return catalog

def resolve_dataset(source_id: Optional[str], dataset_id: Optional[str]) -> Optional[Dict[str, Any]]:
    """Find dataset by source_id and dataset_id, or search across sources."""
    if source_id and source_id in SOURCES:
        for d in SOURCES[source_id]["datasets"]:
            if d["id"] == dataset_id or d["protocol"] == dataset_id:
                return d
    
    for src in SOURCES.values():
        for d in src["datasets"]:
            if d["id"] == dataset_id or d["protocol"] == dataset_id:
                return d
    return None
