"""
Datasets and Sources catalog for RPKClust.
Organizes datasets from NetPlier benchmark, Real ICS Traffic, and BinaryInferno sources,
covering 9 supported protocols (Modbus, DNP3, DHCP, TFTP, NTP, SMB, SMB2, BGP, MAVLink).
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
    },
    "binaryinferno": {
        "id": "binaryinferno",
        "name": "BinaryInferno Dataset",
        "short_name": "BinaryInferno",
        "citation": "BinaryInferno Project",
        "url": "https://github.com/binaryinferno/binaryinferno",
        "badge": "BinaryInferno",
        "color": "emerald",
        "description": "BinaryInferno protocol datasets from the BinaryInferno project, covering 9 protocols across 3 message counts (100, 500, 1000). Messages are stored as hex strings, one per line.",
        "datasets": [
            {
                "id": "bgp_100",
                "name": "BGP (100 msgs)",
                "protocol": "bgp",
                "file": "data/binaryinferno/100/bgp.txt.input",
                "category": "Routing / BGP",
                "packets": 100,
                "header_len": 19,
                "keyword_field": "BGP Message Type (offset 18, 1B)",
                "true_keyword": {"offset": 18, "length": 1, "region": "FOR", "name": "BGP Type"},
                "expected_B": 19,
                "description": "BGP Open, Update, Notification, Keepalive messages."
            },
            {
                "id": "dhcp_100",
                "name": "DHCP (100 msgs)",
                "protocol": "dhcp",
                "file": "data/binaryinferno/100/dhcp.txt.input",
                "category": "Network Infrastructure",
                "packets": 100,
                "header_len": 240,
                "keyword_field": "Message Type Option 53 (offset 242, 1B)",
                "true_keyword": {"offset": 242, "length": 1, "region": "FOR", "name": "DHCP Option 53 (Msg Type)"},
                "expected_B": 240,
                "description": "DHCP discover/offer/request/ack exchanges."
            },
            {
                "id": "dnp3_100",
                "name": "DNP3 (100 msgs)",
                "protocol": "dnp3",
                "file": "data/binaryinferno/100/dnp3.txt.input",
                "category": "Electric Utility SCADA",
                "packets": 100,
                "header_len": 13,
                "keyword_field": "Application Function Code (offset 12, 1B)",
                "true_keyword": {"offset": 12, "length": 1, "region": "FOR", "name": "Application Function Code"},
                "expected_B": 12,
                "description": "DNP3 telemetry and control between master and outstation RTUs."
            },
            {
                "id": "mavlink_100",
                "name": "MAVLink (100 msgs)",
                "protocol": "mavlink",
                "file": "data/binaryinferno/100/mavlink.txt.input",
                "category": "UAV / Robotics",
                "packets": 100,
                "header_len": 8,
                "keyword_field": "Message ID (offset 5-6, 2B little-endian for v2, 1B for v1)",
                "true_keyword": {"offset": 5, "length": 1, "region": "FOR", "name": "MAVLink Msg ID (v1)"},
                "expected_B": 8,
                "description": "MAVLink v1/v2 messages from UAV telemetry."
            },
            {
                "id": "modbus_100",
                "name": "Modbus TCP (100 msgs)",
                "protocol": "modbus",
                "file": "data/binaryinferno/100/modbus.txt.input",
                "category": "SCADA / Industrial",
                "packets": 100,
                "header_len": 8,
                "keyword_field": "Function Code (offset 7, 1B)",
                "true_keyword": {"offset": 7, "length": 1, "region": "FOR", "name": "Function Code"},
                "expected_B": 8,
                "description": "Modbus TCP request/response frames querying holding registers and coils."
            },
            {
                "id": "ntp48_100",
                "name": "NTP (100 msgs)",
                "protocol": "ntp",
                "file": "data/binaryinferno/100/ntp48.txt.input",
                "category": "Time Synchronization",
                "packets": 100,
                "header_len": 48,
                "keyword_field": "Mode (offset 0, bits 5-7)",
                "true_keyword": {"offset": 0, "length": 1, "bits": (5, 7), "name": "Mode (bits 5-7)"},
                "expected_B": 48,
                "description": "NTP packets with client, server, and symmetric active modes."
            },
            {
                "id": "smb_100",
                "name": "SMBv1 (100 msgs)",
                "protocol": "smb",
                "file": "data/binaryinferno/100/smb.txt.input",
                "category": "Storage / File Sharing",
                "packets": 100,
                "header_len": 32,
                "keyword_field": "SMB Command (offset 8, 1B)",
                "true_keyword": {"offset": 8, "length": 1, "region": "FOR", "name": "SMB Command"},
                "expected_B": 32,
                "description": "SMBv1 commands (Negotiate, Session Setup, Tree Connect, Trans2)."
            },
            {
                "id": "smb2_100",
                "name": "SMBv2 (100 msgs)",
                "protocol": "smb2",
                "file": "data/binaryinferno/100/smb2.txt.input",
                "category": "Storage / File Sharing",
                "packets": 100,
                "header_len": 64,
                "keyword_field": "SMB2 Command (offset 16, 2B)",
                "true_keyword": {"offset": 16, "length": 2, "region": "FOR", "name": "SMB2 Command"},
                "expected_B": 64,
                "description": "SMBv2 multi-credit protocol commands."
            },
            {
                "id": "bgp_500",
                "name": "BGP (500 msgs)",
                "protocol": "bgp",
                "file": "data/binaryinferno/500/bgp.txt.input",
                "category": "Routing / BGP",
                "packets": 500,
                "header_len": 19,
                "keyword_field": "BGP Message Type (offset 18, 1B)",
                "true_keyword": {"offset": 18, "length": 1, "region": "FOR", "name": "BGP Type"},
                "expected_B": 19,
                "description": "BGP Open, Update, Notification, Keepalive messages."
            },
            {
                "id": "dhcp_500",
                "name": "DHCP (500 msgs)",
                "protocol": "dhcp",
                "file": "data/binaryinferno/500/dhcp.txt.input",
                "category": "Network Infrastructure",
                "packets": 500,
                "header_len": 240,
                "keyword_field": "Message Type Option 53 (offset 242, 1B)",
                "true_keyword": {"offset": 242, "length": 1, "region": "FOR", "name": "DHCP Option 53 (Msg Type)"},
                "expected_B": 240,
                "description": "DHCP discover/offer/request/ack exchanges."
            },
            {
                "id": "dnp3_500",
                "name": "DNP3 (500 msgs)",
                "protocol": "dnp3",
                "file": "data/binaryinferno/500/dnp3.txt.input",
                "category": "Electric Utility SCADA",
                "packets": 500,
                "header_len": 13,
                "keyword_field": "Application Function Code (offset 12, 1B)",
                "true_keyword": {"offset": 12, "length": 1, "region": "FOR", "name": "Application Function Code"},
                "expected_B": 12,
                "description": "DNP3 telemetry and control between master and outstation RTUs."
            },
            {
                "id": "mavlink_500",
                "name": "MAVLink (500 msgs)",
                "protocol": "mavlink",
                "file": "data/binaryinferno/500/mavlink.txt.input",
                "category": "UAV / Robotics",
                "packets": 500,
                "header_len": 8,
                "keyword_field": "Message ID (offset 5-6, 2B little-endian for v2, 1B for v1)",
                "true_keyword": {"offset": 5, "length": 1, "region": "FOR", "name": "MAVLink Msg ID (v1)"},
                "expected_B": 8,
                "description": "MAVLink v1/v2 messages from UAV telemetry."
            },
            {
                "id": "modbus_500",
                "name": "Modbus TCP (500 msgs)",
                "protocol": "modbus",
                "file": "data/binaryinferno/500/modbus.txt.input",
                "category": "SCADA / Industrial",
                "packets": 500,
                "header_len": 8,
                "keyword_field": "Function Code (offset 7, 1B)",
                "true_keyword": {"offset": 7, "length": 1, "region": "FOR", "name": "Function Code"},
                "expected_B": 8,
                "description": "Modbus TCP request/response frames querying holding registers and coils."
            },
            {
                "id": "ntp48_500",
                "name": "NTP (500 msgs)",
                "protocol": "ntp",
                "file": "data/binaryinferno/500/ntp48.txt.input",
                "category": "Time Synchronization",
                "packets": 500,
                "header_len": 48,
                "keyword_field": "Mode (offset 0, bits 5-7)",
                "true_keyword": {"offset": 0, "length": 1, "bits": (5, 7), "name": "Mode (bits 5-7)"},
                "expected_B": 48,
                "description": "NTP packets with client, server, and symmetric active modes."
            },
            {
                "id": "smb_500",
                "name": "SMBv1 (500 msgs)",
                "protocol": "smb",
                "file": "data/binaryinferno/500/smb.txt.input",
                "category": "Storage / File Sharing",
                "packets": 500,
                "header_len": 32,
                "keyword_field": "SMB Command (offset 8, 1B)",
                "true_keyword": {"offset": 8, "length": 1, "region": "FOR", "name": "SMB Command"},
                "expected_B": 32,
                "description": "SMBv1 commands (Negotiate, Session Setup, Tree Connect, Trans2)."
            },
            {
                "id": "smb2_500",
                "name": "SMBv2 (500 msgs)",
                "protocol": "smb2",
                "file": "data/binaryinferno/500/smb2.txt.input",
                "category": "Storage / File Sharing",
                "packets": 500,
                "header_len": 64,
                "keyword_field": "SMB2 Command (offset 16, 2B)",
                "true_keyword": {"offset": 16, "length": 2, "region": "FOR", "name": "SMB2 Command"},
                "expected_B": 64,
                "description": "SMBv2 multi-credit protocol commands."
            },
            {
                "id": "bgp_1000",
                "name": "BGP (1000 msgs)",
                "protocol": "bgp",
                "file": "data/binaryinferno/1000/bgp.txt.input",
                "category": "Routing / BGP",
                "packets": 1000,
                "header_len": 19,
                "keyword_field": "BGP Message Type (offset 18, 1B)",
                "true_keyword": {"offset": 18, "length": 1, "region": "FOR", "name": "BGP Type"},
                "expected_B": 19,
                "description": "BGP Open, Update, Notification, Keepalive messages."
            },
            {
                "id": "dhcp_1000",
                "name": "DHCP (1000 msgs)",
                "protocol": "dhcp",
                "file": "data/binaryinferno/1000/dhcp.txt.input",
                "category": "Network Infrastructure",
                "packets": 1000,
                "header_len": 240,
                "keyword_field": "Message Type Option 53 (offset 242, 1B)",
                "true_keyword": {"offset": 242, "length": 1, "region": "FOR", "name": "DHCP Option 53 (Msg Type)"},
                "expected_B": 240,
                "description": "DHCP discover/offer/request/ack exchanges."
            },
            {
                "id": "dnp3_1000",
                "name": "DNP3 (1000 msgs)",
                "protocol": "dnp3",
                "file": "data/binaryinferno/1000/dnp3.txt.input",
                "category": "Electric Utility SCADA",
                "packets": 1000,
                "header_len": 13,
                "keyword_field": "Application Function Code (offset 12, 1B)",
                "true_keyword": {"offset": 12, "length": 1, "region": "FOR", "name": "Application Function Code"},
                "expected_B": 12,
                "description": "DNP3 telemetry and control between master and outstation RTUs."
            },
            {
                "id": "mavlink_1000",
                "name": "MAVLink (1000 msgs)",
                "protocol": "mavlink",
                "file": "data/binaryinferno/1000/mavlink.txt.input",
                "category": "UAV / Robotics",
                "packets": 1000,
                "header_len": 8,
                "keyword_field": "Message ID (offset 5-6, 2B little-endian for v2, 1B for v1)",
                "true_keyword": {"offset": 5, "length": 1, "region": "FOR", "name": "MAVLink Msg ID (v1)"},
                "expected_B": 8,
                "description": "MAVLink v1/v2 messages from UAV telemetry."
            },
            {
                "id": "modbus_1000",
                "name": "Modbus TCP (1000 msgs)",
                "protocol": "modbus",
                "file": "data/binaryinferno/1000/modbus.txt.input",
                "category": "SCADA / Industrial",
                "packets": 1000,
                "header_len": 8,
                "keyword_field": "Function Code (offset 7, 1B)",
                "true_keyword": {"offset": 7, "length": 1, "region": "FOR", "name": "Function Code"},
                "expected_B": 8,
                "description": "Modbus TCP request/response frames querying holding registers and coils."
            },
            {
                "id": "ntp48_1000",
                "name": "NTP (1000 msgs)",
                "protocol": "ntp",
                "file": "data/binaryinferno/1000/ntp48.txt.input",
                "category": "Time Synchronization",
                "packets": 1000,
                "header_len": 48,
                "keyword_field": "Mode (offset 0, bits 5-7)",
                "true_keyword": {"offset": 0, "length": 1, "bits": (5, 7), "name": "Mode (bits 5-7)"},
                "expected_B": 48,
                "description": "NTP packets with client, server, and symmetric active modes."
            },
            {
                "id": "smb_1000",
                "name": "SMBv1 (1000 msgs)",
                "protocol": "smb",
                "file": "data/binaryinferno/1000/smb.txt.input",
                "category": "Storage / File Sharing",
                "packets": 1000,
                "header_len": 32,
                "keyword_field": "SMB Command (offset 8, 1B)",
                "true_keyword": {"offset": 8, "length": 1, "region": "FOR", "name": "SMB Command"},
                "expected_B": 32,
                "description": "SMBv1 commands (Negotiate, Session Setup, Tree Connect, Trans2)."
            },
            {
                "id": "smb2_1000",
                "name": "SMBv2 (1000 msgs)",
                "protocol": "smb2",
                "file": "data/binaryinferno/1000/smb2.txt.input",
                "category": "Storage / File Sharing",
                "packets": 1000,
                "header_len": 64,
                "keyword_field": "SMB2 Command (offset 16, 2B)",
                "true_keyword": {"offset": 16, "length": 2, "region": "FOR", "name": "SMB2 Command"},
                "expected_B": 64,
                "description": "SMBv2 multi-credit protocol commands."
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
