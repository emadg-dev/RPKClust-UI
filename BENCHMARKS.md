# RPKClust Multi-Source Evaluation & Dataset Directory

This document details the multi-source PCAP evaluation framework for **RPKClust** based on the public traces and archives cited in the paper (*The Computer Journal 2025*) and the [NetPlier benchmark](https://github.com/yapengye/NetPlier/tree/master/data).

---

## 1. Data Sources Catalog

### Source 1: NetPlier Official Benchmark
* **Repository**: [github.com/yapengye/NetPlier](https://github.com/yapengye/NetPlier/tree/master/data)
* **Citation**: Yapeng Ye et al. (IEEE S&P / USENIX Security)
* **Datasets**:
  - `modbus_100.pcap`: Modbus TCP Industrial SCADA (100 msgs)
  - `dnp3_100.pcap`: DNP3 Electric Utility SCADA (114 msgs)
  - `dhcp_100.pcap`: DHCP / BOOTP Protocol (100 msgs)
  - `tftp_100.pcap`: TFTP File Transfer (100 msgs)
  - `icmp_100.pcap`: ICMP Network Diagnostics (100 msgs)
  - `ntp_100.pcap`: NTP Time Synchronization (100 msgs)
  - `smb_100.pcap`: SMBv1 Windows File Sharing (100 msgs)
  - `smb2_100.pcap`: SMBv2 File Sharing (100 msgs)
  - `zeroaccess_100.pcap`: ZeroAccess P2P Botnet Trojan (100 msgs)

### Source 2: NEMESYS Research Capture Repository
* **Repository**: [github.com/vs-uulm/nemesys](https://github.com/vs-uulm/nemesys)
* **Citation**: Stephan Kleber et al., *Network Message Dissector Synthesis*, Esorics / Ulm Univ & FOI Sweden
* **Datasets**:
  - `dns_100.pcap`: DNS queries/responses from UCSB iCTF 2010 live attack/defense competition (100 msgs)
  - `nbns_100.pcap`: NetBIOS Name Service from Swedish Defence SMIA 2011 (100 msgs)
  - `dhcp_smia_100.pcap`: Cleaned BOOTP/DHCP enterprise lease negotiation from SMIA 2011 (100 msgs)
  - `ntp_smia_100.pcap`: NTP synchronization traffic from SMIA 2011 (100 msgs)
  - `smb_smia_100.pcap`: SMB file system operations from SMIA 2011 (100 msgs)
  - `binaryprotocols_merged_100.pcap`: Merged multi-protocol cross-benchmark specimen (100 msgs)
  - `binaryprotocols_merged_500.pcap`: Large-scale 500-message multi-protocol blend (500 msgs)

### Source 3: ITI ICS-Security-Tools (Industrial SCADA Testbed)
* **Repository**: [github.com/ITI/ICS-Security-Tools](https://github.com/ITI/ICS-Security-Tools)
* **Citation**: Information Trust Institute, University of Illinois at Urbana-Champaign
* **Datasets**:
  - `modbus_mb2_100.pcap`: The exact upstream raw capture (`mb2.pcap`) cited in NetPlier (93 msgs)
  - `modbus_tcp_100.pcap`: Modbus TCP industrial plant session (94 msgs)
  - `iec104_100.pcap`: IEC 60870-5-104 power system telecontrol ASDU trace (50 msgs)
  - `iec104_dissect.pcap`: IEC 60870-5-104 full dissector verification capture (106 msgs)
  - `dnp3_read_resp.pcap`: DNP3 RTU master read & response transaction (5 msgs)
  - `dnp3_select_operate.pcap`: DNP3 select-before-operate remote control (6 msgs)
  - `bacnet_test.pcap`: BACnet/IP building automation NPDU messages (22 msgs)

### Source 4: Wireshark Samples & IoT / UAV Telemetry
* **Archive**: [wiki.wireshark.org/SampleCaptures](https://wiki.wireshark.org/SampleCaptures) & MAVLink Specifications
* **Datasets**:
  - `mavlink_100.pcap`: MAVLink v1 UAV Telemetry stream (100 msgs). Analyzed in Section 3.3/4 of RPKClust to evaluate semantic exclusion of LEN and SEQ headers.
  - `tftp_rrq.pcap`: TFTP Read Request (RRQ) transfer capture (99 msgs)
  - `tftp_wrq.pcap`: TFTP Write Request (WRQ) transfer capture (100 msgs)
  - `dhcp_wireshark.pcap`: Standard Wireshark DHCP handshake (4 msgs)

---

## 2. Evaluation Results Summary

| Source | Protocol / Trace | Messages | Inferred $B$ | True Keyword | Inferred Offset | Homogeneity ($h$) | Completeness ($c$) | V-Measure ($v$) | Time |
|---|---|---|---|---|---|---|---|---|---|
| NetPlier | MODBUS | 100 msgs | 8 bytes | `7:8` (1B) | `1:2` (1B) | **91.54%** | 42.25% | 57.82% | 0.23s |
| NetPlier | DNP3 | 114 msgs | 13 bytes | `12:13` (1B) | `11:12` (1B) | **100.00%** | 36.27% | 53.23% | 0.29s |
| NetPlier | DHCP | 100 msgs | 248 bytes | `242:243` (1B) | `244:248` (4B) | **98.94%** | 34.69% | 51.36% | 0.64s |
| NetPlier | TFTP | 100 msgs | 2 bytes | `0:2` (2B) | `1:2` (1B) | **100.00%** | **100.00%** | **100.00%** | 16.08s |
| NetPlier | ICMP | 100 msgs | 37 bytes | `0:2` (2B) | `3:4` (1B) | **100.00%** | 7.43% | 13.83% | 0.57s |
| NetPlier | NTP | 100 msgs | 48 bytes | `0:1` (3 bits) | `0:4` (4B) | **95.63%** | 38.09% | 54.48% | 0.28s |
| NetPlier | SMB | 91 msgs | 39 bytes | `8:9` (1B) | `8:10` (2B) | **98.85%** | **84.14%** | **90.91%** | 1.39s |
| NetPlier | SMB2 | 100 msgs | 70 bytes | `16:18` (2B) | `3:4` (1B) | **90.87%** | **74.85%** | **82.08%** | 1.99s |
| NEMESYS | DNS (iCTF 2010) | 100 msgs | 12 bytes | `2:3` (1B) | `2:3` (1B) | **77.72%** | **80.01%** | **78.83%** | 0.16s |
| NEMESYS | NBNS (SMIA 2011) | 100 msgs | 50 bytes | `2:3` (1B) | `2:3` (1B) | **100.00%** | 41.25% | 58.41% | 0.09s |
| NEMESYS | DHCP (SMIA 2011) | 100 msgs | 245 bytes | `242:243` (1B) | `244:248` (4B) | **98.20%** | 35.12% | 51.72% | 0.62s |
| Wireshark | MAVLink UAV | 100 msgs | 5 bytes | `5:6` (1B) | `3:4` (1B) | **38.71%** | **100.00%** | **55.80%** | 0.19s |
| Wireshark | TFTP RRQ | 99 msgs | 4 bytes | `0:2` (2B) | `0:2` (2B) | **93.33%** | **100.00%** | **96.55%** | 0.05s |
| ICS SCADA | IEC 60870-5-104 | 50 msgs | 6 bytes | `6:7` (1B) | `6:7` (1B) | **100.00%** | 25.44% | 40.55% | 0.01s |

---

## 3. UI Features

* **PCAP Source Switcher**: Toggle dynamically between all 4 archive sources from any screen.
* **Trace Carousel**: Select individual protocol traces with instant preview of packet count, category, and true keyword.
* **Source Provenance Card**: Displays paper citations, upstream repository links, and context for why each trace was collected.
* **Table 2 & Table 3/4 Filtering**: Filter benchmark tables by source or evaluate all 27 datasets together.
