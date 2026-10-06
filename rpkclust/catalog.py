"""
Datasets and Sources catalog for RPKClust.
Organizes PCAPs from sources mentioned in the paper and NetPlier benchmark.
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
        "description": "The official benchmark dataset from the NetPlier repository, cited and evaluated throughout the RPKClust paper.",
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
                "id": "icmp",
                "name": "ICMP",
                "protocol": "icmp",
                "file": "data/netplier/icmp_100.pcap",
                "category": "Network Diagnostics",
                "packets": 100,
                "header_len": 4,
                "keyword_field": "Type & Code (offset 0, 2B)",
                "true_keyword": {"offset": 0, "length": 2, "region": "FOR", "name": "Type & Code"},
                "expected_B": 37,
                "description": "Internet Control Message Protocol echo request/reply, unreachable, and time-exceeded."
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
            },
            {
                "id": "zeroaccess",
                "name": "ZeroAccess Botnet",
                "protocol": "zeroaccess",
                "file": "data/netplier/zeroaccess_100.pcap",
                "category": "Malware P2P Botnet",
                "packets": 100,
                "header_len": 16,
                "keyword_field": "Command ID (offset 0, 4B)",
                "true_keyword": {"offset": 0, "length": 4, "region": "FOR", "name": "P2P Command ID"},
                "expected_B": 16,
                "description": "ZeroAccess rootkit peer-to-peer control and file exchange protocol from UNB ISCX."
            }
        ]
    },
    "nemesys": {
        "id": "nemesys",
        "name": "NEMESYS Research Repository (SMIA 2011 & iCTF 2010)",
        "short_name": "NEMESYS / SMIA",
        "citation": "Kleber et al., Esorics / Ulm Univ & FOI Sweden",
        "url": "https://github.com/vs-uulm/nemesys",
        "badge": "Defense & Cyber CTF",
        "color": "emerald",
        "description": "Real traces filtered from FOI Sweden SMIA 2011 defence network exercise and UCSB iCTF 2010 cyber competition.",
        "datasets": [
            {
                "id": "dns",
                "name": "DNS (iCTF 2010)",
                "protocol": "dns",
                "file": "data/nemesys/dns_100.pcap",
                "category": "Network Infrastructure",
                "packets": 100,
                "header_len": 12,
                "keyword_field": "Flags / Opcode (offset 2, 1B)",
                "true_keyword": {"offset": 2, "length": 1, "region": "FOR", "name": "Flags / Opcode"},
                "expected_B": 12,
                "description": "Domain Name System queries and responses from UCSB iCTF live attack/defense competition."
            },
            {
                "id": "nbns",
                "name": "NetBIOS Name Service",
                "protocol": "nbns",
                "file": "data/nemesys/nbns_100.pcap",
                "category": "Name Resolution",
                "packets": 100,
                "header_len": 12,
                "keyword_field": "Opcode / Flags (offset 2, 1B)",
                "true_keyword": {"offset": 2, "length": 1, "region": "FOR", "name": "Opcode / Flags"},
                "expected_B": 50,
                "description": "NetBIOS Name Service registration, refresh, and query broadcasts from SMIA 2011."
            },
            {
                "id": "dhcp_smia",
                "name": "DHCP (SMIA 2011)",
                "protocol": "dhcp",
                "file": "data/nemesys/dhcp_smia_100.pcap",
                "category": "Network Infrastructure",
                "packets": 100,
                "header_len": 240,
                "keyword_field": "Option 53 (offset 242, 1B)",
                "true_keyword": {"offset": 242, "length": 1, "region": "FOR", "name": "Option 53 (Msg Type)"},
                "expected_B": 245,
                "description": "Cleaned BOOTP / DHCP enterprise lease negotiation traffic from FOI Swedish Defence."
            },
            {
                "id": "ntp_smia",
                "name": "NTP (SMIA 2011)",
                "protocol": "ntp",
                "file": "data/nemesys/ntp_smia_100.pcap",
                "category": "Time Synchronization",
                "packets": 100,
                "header_len": 48,
                "keyword_field": "Mode (offset 0, bits 5-7)",
                "true_keyword": {"offset": 0, "length": 1, "bits": (5, 7), "name": "Mode (bits 5-7)"},
                "expected_B": 48,
                "description": "Real NTP server synchronization traffic collected from enterprise network nodes."
            },
            {
                "id": "smb_smia",
                "name": "SMBv1 (SMIA 2011)",
                "protocol": "smb",
                "file": "data/nemesys/smb_smia_100.pcap",
                "category": "Storage / File Sharing",
                "packets": 100,
                "header_len": 32,
                "keyword_field": "SMB Command (offset 8, 1B)",
                "true_keyword": {"offset": 8, "length": 1, "region": "FOR", "name": "SMB Command"},
                "expected_B": 39,
                "description": "SMB file system operations filtered from SMIA 2011 capture."
            },
            {
                "id": "binaryprotocols_merged_100",
                "name": "Merged Multi-Protocol (100 msgs)",
                "protocol": "binaryprotocols_merged",
                "file": "data/nemesys/binaryprotocols_merged_100.pcap",
                "category": "Multi-Protocol Blend",
                "packets": 100,
                "header_len": 12,
                "keyword_field": "Protocol Signature (offset 0, 2B)",
                "true_keyword": {"offset": 0, "length": 2, "region": "FOR", "name": "Protocol Signature"},
                "expected_B": 12,
                "description": "Synthetic multi-protocol specimen blending DHCP, DNS, NBNS, NTP, and SMB."
            },
            {
                "id": "binaryprotocols_merged_500",
                "name": "Merged Multi-Protocol (500 msgs)",
                "protocol": "binaryprotocols_merged",
                "file": "data/nemesys/binaryprotocols_merged_500.pcap",
                "category": "Multi-Protocol Blend",
                "packets": 500,
                "header_len": 12,
                "keyword_field": "Protocol Signature (offset 0, 2B)",
                "true_keyword": {"offset": 0, "length": 2, "region": "FOR", "name": "Protocol Signature"},
                "expected_B": 12,
                "description": "Large-scale 500-message multi-protocol blend testing scalability and heterogeneity."
            }
        ]
    },
    "ics_scada": {
        "id": "ics_scada",
        "name": "ITI ICS-Security-Tools (Industrial SCADA Testbed)",
        "short_name": "ICS SCADA",
        "citation": "Information Trust Institute, Univ of Illinois",
        "url": "https://github.com/ITI/ICS-Security-Tools",
        "badge": "Industrial & SCADA",
        "color": "amber",
        "description": "Industrial control captures from real PLC/RTU equipment, electrical substations, and SCADA networks.",
        "datasets": [
            {
                "id": "modbus_mb2",
                "name": "Modbus TCP (mb2 Upstream)",
                "protocol": "modbus",
                "file": "data/ics_scada/modbus_mb2_100.pcap",
                "category": "SCADA / Industrial",
                "packets": 93,
                "header_len": 8,
                "keyword_field": "Function Code (offset 7, 1B)",
                "true_keyword": {"offset": 7, "length": 1, "region": "FOR", "name": "Function Code"},
                "expected_B": 8,
                "description": "The exact mb2 capture cited by NetPlier and RPKClust authors containing multiple MBTCP transactions."
            },
            {
                "id": "modbus_tcp",
                "name": "Modbus TCP Testbed",
                "protocol": "modbus",
                "file": "data/ics_scada/modbus_tcp_100.pcap",
                "category": "SCADA / Industrial",
                "packets": 94,
                "header_len": 8,
                "keyword_field": "Function Code (offset 7, 1B)",
                "true_keyword": {"offset": 7, "length": 1, "region": "FOR", "name": "Function Code"},
                "expected_B": 8,
                "description": "Industrial plant SCADA Modbus session polling analog inputs and discrete outputs."
            },
            {
                "id": "iec104",
                "name": "IEC 60870-5-104 Telecontrol",
                "protocol": "iec104",
                "file": "data/ics_scada/iec104_100.pcap",
                "category": "Power Grid Telecontrol",
                "packets": 50,
                "header_len": 6,
                "keyword_field": "ASDU Type ID (offset 6, 1B)",
                "true_keyword": {"offset": 6, "length": 1, "region": "FOR", "name": "ASDU Type Identification"},
                "expected_B": 6,
                "description": "European standard power system telecontrol protocol with ASDU measurement and command frames."
            },
            {
                "id": "iec104_dissect",
                "name": "IEC 60870-5-104 Full Dissector",
                "protocol": "iec104",
                "file": "data/ics_scada/iec104_dissect.pcap",
                "category": "Power Grid Telecontrol",
                "packets": 106,
                "header_len": 6,
                "keyword_field": "ASDU Type ID (offset 6, 1B)",
                "true_keyword": {"offset": 6, "length": 1, "region": "FOR", "name": "ASDU Type Identification"},
                "expected_B": 6,
                "description": "Substation telecontrol session testing I, S, and U transmission control frame dissections."
            },
            {
                "id": "dnp3_read_resp",
                "name": "DNP3 Read & Response",
                "protocol": "dnp3",
                "file": "data/ics_scada/dnp3_read_resp.pcap",
                "category": "Electric Utility SCADA",
                "packets": 5,
                "header_len": 13,
                "keyword_field": "Function Code (offset 12, 1B)",
                "true_keyword": {"offset": 12, "length": 1, "region": "FOR", "name": "Function Code"},
                "expected_B": 13,
                "description": "Master station polling RTU telemetry with Class 0/1/2/3 data read requests."
            },
            {
                "id": "dnp3_select_operate",
                "name": "DNP3 Select-Before-Operate",
                "protocol": "dnp3",
                "file": "data/ics_scada/dnp3_select_operate.pcap",
                "category": "Electric Utility SCADA",
                "packets": 6,
                "header_len": 13,
                "keyword_field": "Function Code (offset 12, 1B)",
                "true_keyword": {"offset": 12, "length": 1, "region": "FOR", "name": "Function Code"},
                "expected_B": 13,
                "description": "Critical two-step breaker trip/close sequence verifying remote command execution."
            },
            {
                "id": "bacnet",
                "name": "BACnet/IP Building Control",
                "protocol": "bacnet",
                "file": "data/ics_scada/bacnet_test.pcap",
                "category": "Building Automation",
                "packets": 22,
                "header_len": 4,
                "keyword_field": "BVLC Function (offset 1, 1B)",
                "true_keyword": {"offset": 1, "length": 1, "region": "FOR", "name": "BVLC Function"},
                "expected_B": 4,
                "description": "Building Automation and Control networks protocol for HVAC, lighting, and access control."
            }
        ]
    },
    "wireshark_iot": {
        "id": "wireshark_iot",
        "name": "Wireshark Archive & UAV IoT Specimen",
        "short_name": "Wireshark & IoT",
        "citation": "Wireshark Wiki & MAVLink Consortium",
        "url": "https://wiki.wireshark.org/SampleCaptures",
        "badge": "IoT & UAV Telemetry",
        "color": "sky",
        "description": "Sample captures from Wireshark Foundation and drone telemetry explicitly analyzed in Section 3.3/4 of RPKClust.",
        "datasets": [
            {
                "id": "mavlink",
                "name": "MAVLink v1 UAV Telemetry",
                "protocol": "mavlink",
                "file": "data/wireshark_iot/mavlink_100.pcap",
                "category": "Robotics & Drone Telemetry",
                "packets": 100,
                "header_len": 6,
                "keyword_field": "Message ID (offset 5, 1B)",
                "true_keyword": {"offset": 5, "length": 1, "region": "FOR", "name": "Message ID (msgid)"},
                "expected_B": 5,
                "description": "Micro Air Vehicle telemetry explicitly analyzed in RPKClust paper (Heartbeat, Attitude, GPS, Ping, Command)."
            },
            {
                "id": "tftp_rrq",
                "name": "TFTP Read Request (RRQ)",
                "protocol": "tftp",
                "file": "data/wireshark_iot/tftp_rrq.pcap",
                "category": "File Transfer",
                "packets": 99,
                "header_len": 2,
                "keyword_field": "Opcode (offset 0, 2B)",
                "true_keyword": {"offset": 0, "length": 2, "region": "FOR", "name": "Opcode"},
                "expected_B": 2,
                "description": "Wireshark sample capture of TFTP read request session with blocks and acknowledgments."
            },
            {
                "id": "tftp_wrq",
                "name": "TFTP Write Request (WRQ)",
                "protocol": "tftp",
                "file": "data/wireshark_iot/tftp_wrq.pcap",
                "category": "File Transfer",
                "packets": 100,
                "header_len": 2,
                "keyword_field": "Opcode (offset 0, 2B)",
                "true_keyword": {"offset": 0, "length": 2, "region": "FOR", "name": "Opcode"},
                "expected_B": 2,
                "description": "Wireshark sample capture of TFTP write request upload session."
            },
            {
                "id": "dhcp_wireshark",
                "name": "DHCP Transaction",
                "protocol": "dhcp",
                "file": "data/wireshark_iot/dhcp_wireshark.pcap",
                "category": "Network Infrastructure",
                "packets": 4,
                "header_len": 240,
                "keyword_field": "Option 53 (offset 242, 1B)",
                "true_keyword": {"offset": 242, "length": 1, "region": "FOR", "name": "Option 53"},
                "expected_B": 240,
                "description": "Standard Wireshark sample capture of DHCP discover, offer, request, and ack handshake."
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
    
    # Search all sources
    for src in SOURCES.values():
        for d in src["datasets"]:
            if d["id"] == dataset_id or d["protocol"] == dataset_id:
                return d
    return None
