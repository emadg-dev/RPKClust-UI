# RPKClust Multi-Source Evaluation & Dataset Directory

This document details the multi-source PCAP evaluation framework for **RPKClust**, covering all 7 supported protocols across two data sources.

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
  - `ntp_100.pcap`: NTP Time Synchronization (100 msgs)
  - `smb_100.pcap`: SMBv1 Windows File Sharing (100 msgs)
  - `smb2_100.pcap`: SMBv2 File Sharing (100 msgs)

### Source 2: Real ICS Traffic
* **Repository**: [github.com/ICS-Security-Tools](https://github.com/ICS-Security-Tools)
* **Datasets**:
  - `modbus.pcap`: Modbus TCP Industrial SCADA (4901 msgs)
  - `dnp3.pcap`: DNP3 Electric Utility SCADA (198 msgs)
  - `dhcp.pcap`: DHCP / BOOTP Protocol (100 msgs)
  - `tftp.pcap`: TFTP File Transfer (100 msgs)
  - `ntp.pcap`: NTP Time Synchronization (100 msgs)
  - `smb.pcap`: SMBv1 Windows File Sharing (100 msgs)
  - `smb2.pcap`: SMBv2 File Sharing (100 msgs)

---

## 2. Evaluation Results Summary (NetPlier)

| Source | Protocol / Trace | Messages | Inferred $B$ | True Keyword | Homogeneity ($h$) | Completeness ($c$) | V-Measure ($v$) | Time |
|---|---|---|---|---|---|---|---|---|
| NetPlier | MODBUS | 100 msgs | 8 bytes | offset 7, 1B | 91.54% | 42.25% | 57.82% | 0.23s |
| NetPlier | DNP3 | 114 msgs | 13 bytes | offset 12, 1B | 100.00% | 36.27% | 53.23% | 0.29s |
| NetPlier | DHCP | 100 msgs | 248 bytes | offset 242, 1B | 98.94% | 34.69% | 51.36% | 0.64s |
| NetPlier | TFTP | 100 msgs | 2 bytes | offset 0, 2B | 100.00% | 100.00% | 100.00% | 16.08s |
| NetPlier | NTP | 100 msgs | 48 bytes | offset 0, bits 5-7 | 95.63% | 38.09% | 54.48% | 0.28s |
| NetPlier | SMB | 91 msgs | 39 bytes | offset 8, 1B | 98.85% | 84.14% | 90.91% | 1.39s |
| NetPlier | SMB2 | 100 msgs | 70 bytes | offset 16, 2B | 90.87% | 74.85% | 82.08% | 1.99s |

**Average V-Measure (NetPlier)**: 71.2%

### True Keyword Offsets (NetPlier)

| Protocol | Header Length | Keyword Offset | Field Name |
|---|---|---|---|
| Modbus TCP | 8 bytes | offset 7, 1B | Function Code |
| DNP3 | 13 bytes | offset 12, 1B | Application Function Code |
| DHCP | 240 bytes | offset 242, 1B | DHCP Message Type (Option 53) |
| TFTP | 2 bytes | offset 0, 2B | Opcode (RRQ/WRQ/DATA/ACK) |
| NTP | 48 bytes | offset 0, bits 5-7 | Mode field |
| SMB | 32 bytes | offset 8, 1B | SMB Command |
| SMB2 | 64 bytes | offset 16, 2B | SMB2 Command |

---

## 3. Evaluation Results Summary (Real ICS Traffic)

| Source | Protocol / Trace | Messages | Inferred $B$ | True Keyword | Homogeneity ($h$) | Completeness ($c$) | V-Measure ($v$) | Time |
|---|---|---|---|---|---|---|---|---|
| ICS Real | MODBUS | 100 msgs | 8 bytes | offset 7, 1B | — | — | 44.61% | — |
| ICS Real | DNP3 | 100 msgs | 6 bytes | offset 12, 1B | — | — | 69.94% | — |
| ICS Real | DHCP | 100 msgs | 245 bytes | offset 242, 1B | — | — | 60.93% | — |
| ICS Real | TFTP | 100 msgs | 2 bytes | offset 0, 2B | — | — | 100.00% | — |
| ICS Real | NTP | 100 msgs | 43 bytes | offset 0, bits 5-7 | — | — | 78.72% | — |
| ICS Real | SMB | 91 msgs | 39 bytes | offset 8, 1B | — | — | 85.03% | — |
| ICS Real | SMB2 | 100 msgs | 70 bytes | offset 16, 2B | — | — | 82.08% | — |

**Average V-Measure (ICS Real)**: 74.5%

---

## 4. UI Features

* **PCAP Source Switcher**: Toggle dynamically between archive sources from any screen.
* **Trace Carousel**: Select individual protocol traces with instant preview of packet count, category, and true keyword.
* **Source Provenance Card**: Displays source citations, upstream repository links, and context for why each trace was collected.
* **Table 2 & Table 3/4 Filtering**: Filter benchmark tables by source or evaluate all 7 datasets together.
