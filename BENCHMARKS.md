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
  - `ntp_100.pcap`: NTP Time Synchronization (100 msgs)
  - `smb_100.pcap`: SMBv1 Windows File Sharing (100 msgs)
  - `smb2_100.pcap`: SMBv2 File Sharing (100 msgs)

---

## 2. Evaluation Results Summary

| Source | Protocol / Trace | Messages | Inferred $B$ | True Keyword | Inferred Offset | Homogeneity ($h$) | Completeness ($c$) | V-Measure ($v$) | Time |
|---|---|---|---|---|---|---|---|---|---|
| NetPlier | MODBUS | 100 msgs | 8 bytes | `7:8` (1B) | `1:2` (1B) | **91.54%** | 42.25% | 57.82% | 0.23s |
| NetPlier | DNP3 | 114 msgs | 13 bytes | `12:13` (1B) | `11:12` (1B) | **100.00%** | 36.27% | 53.23% | 0.29s |
| NetPlier | DHCP | 100 msgs | 248 bytes | `242:243` (1B) | `244:248` (4B) | **98.94%** | 34.69% | 51.36% | 0.64s |
| NetPlier | TFTP | 100 msgs | 2 bytes | `0:2` (2B) | `1:2` (1B) | **100.00%** | **100.00%** | **100.00%** | 16.08s |
| NetPlier | NTP | 100 msgs | 48 bytes | `0:1` (3 bits) | `0:4` (4B) | **95.63%** | 38.09% | 54.48% | 0.28s |
| NetPlier | SMB | 91 msgs | 39 bytes | `8:9` (1B) | `8:10` (2B) | **98.85%** | **84.14%** | **90.91%** | 1.39s |
| NetPlier | SMB2 | 100 msgs | 70 bytes | `16:18` (2B) | `3:4` (1B) | **90.87%** | **74.85%** | **82.08%** | 1.99s |

---

## 3. UI Features

* **PCAP Source Switcher**: Toggle dynamically between archive sources from any screen.
* **Trace Carousel**: Select individual protocol traces with instant preview of packet count, category, and true keyword.
* **Source Provenance Card**: Displays paper citations, upstream repository links, and context for why each trace was collected.
* **Table 2 & Table 3/4 Filtering**: Filter benchmark tables by source or evaluate all 7 datasets together.
