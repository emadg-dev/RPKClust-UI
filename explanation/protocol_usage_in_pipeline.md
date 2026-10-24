# Protocol-Specific Knowledge Usage in RPKClust Pipeline

## Direct Answer

**No.** The core RPKClust pipeline (boundary detection → candidate generation → Stage 1 constraints → Stage 2 constraints → clustering) does **NOT** use any application-layer protocol-specific knowledge extracted from PCAPs during processing. All protocol-specific knowledge is isolated exclusively to evaluation/truth-checking modules.

RPKClust is designed to be **protocol-agnostic** during its core analysis, consistent with its paper thesis of avoiding global MSA and not requiring prior protocol knowledge.

---

## What the Pipeline Does NOT Use (Protocol-Agnostic)

### 1. Boundary Detection (`rpkclust/boundary.py`)
- Uses six domain-agnostic semantic detectors: Constant, Sequence, Timestamp, Sparse, Address, Checksum.
- Detectors analyze byte values, arithmetic progressions, timestamp windows, cardinality ratios, address swaps, and checksum algorithms — none reference Modbus/DNP3/DHCP/etc. semantics.
- No hardcoded protocol offsets, function codes, or message type identifiers.

### 2. Candidate Generation (`rpkclust/candidates/`)
- FOR region: sliding windows of lengths {1,2,4} based on byte alignment and continuity.
- NFOR region: TLV pattern detection based on structural properties (type tag + length + value), not protocol-specific TLV semantics.
- No protocol-specific field definitions.

### 3. Stage 1 Constraints (`rpkclust/constraints/stage1.py`)
- Message similarity: alignment-free FOR positional match + NFOR SequenceMatcher.
- Remote coupling: request-response pair structural correlation.
- Structure consistency: message length variance within clusters.
- Dimension: distinct value count and singleton cluster ratios.
- All statistical, domain-independent.

### 4. Stage 2 Constraints (`rpkclust/constraints/stage2.py`)
- Bit-use: MSB distribution vs theoretical uniform distribution.
- Position: offset-based probability (FOR near start = higher probability; NFOR fixed).
- Both are mathematical, not protocol-specific.

### 5. Clustering (`rpkclust/cluster.py`)
- Groups messages by extracted keyword value hex strings.
- No protocol knowledge — purely value-based grouping.

### 6. Metrics (`rpkclust/metrics.py`)
- Homogeneity/Completeness/V-measure computed on labels vs predictions.
- Labels come from ground truth (evaluation only), not pipeline processing.

---

## Where Protocol-Specific Knowledge IS Used (Evaluation / Truth Checking Only)

These modules contain protocol-specific logic and are explicitly excluded from the core pipeline:

### 1. `rpkclust/eval/ground_truth.py`
- `extract_ground_truth_label()`: Hardcoded true keyword offsets per protocol:
  - Modbus: offset 7, 1B (Function Code)
  - DNP3: offset 12, 1B (Application Function Code)
  - DHCP: offset 242, 1B (Message Type Option 53)
  - TFTP: offset 0, 2B (Opcode)
  - NTP: offset 0, bits 5-7 (Mode)
  - SMB: offset 8, 1B (Command)
  - SMB2: offset 16, 2B (Command)
  - BGP: offset 18, 1B (Message Type)
  - MAVLink: offset 5, 1B (Message ID)
- `clean_protocol_messages()`: Protocol-specific cleaning:
  - **Modbus**: Truncates to Modbus TCP length field (bytes 4-5).
  - **SMB/SMB2**: Filters to SMB magic bytes (`\xffSMB` / `\xfeSMB`).
- These are called only during benchmark/evaluation paths (`run_benchmark_on_pcap`, `run_benchmark_on_csv`, `api_runner.run_dataset`).

### 2. `rpkclust/catalog.py`
- `SOURCES` registry stores true keyword offsets/lengths per dataset for evaluation comparison.
- Used by UI benchmark views and API `run_dataset` — not by `run_pipeline()`.

### 3. `rpkclust/api_runner.py` and `rpkclust/cli.py`
- `run_dataset`, `benchmark_all`, `scaling_benchmark`, `eval` commands invoke `clean_protocol_messages()` and ground-truth evaluation.
- These are CLI/API orchestration layers, not pipeline stages.

---

## Gray Areas / Edge Cases

### 1. Generic L2–L4 Stripping (`rpkclust/io/loader.py`, `_parse_raw_eth_ip`)
- Strips Ethernet, IPv4, TCP/UDP headers to extract application payload.
- Handles VLAN (0x8100/0x88A8), Linux SLL (113), raw IP (12/101).
- This is **generic networking protocol handling**, not application-layer protocol knowledge. It extracts the payload that all downstream stages analyze uniformly.

### 2. Synthetic Endpoint Defaults (`rpkclust/io/loader.py`, `load_hex_lines`)
- For plain hex input without real endpoints, assigns `10.0.0.1:10000 ↔ 10.0.0.2:502` (port 502 = Modbus convention).
- This is only for **session/direction assignment fallback** when no real endpoints exist. It does not influence boundary detection, candidate generation, or constraint evaluation.
- Direction assignment is used by Stage 1 remote coupling and Stage 2 per-direction inference, but the port itself is not interpreted as Modbus knowledge — it's just an endpoint label.

---

## Evidence Summary

| Module | Protocol-Specific? | Used in Core Pipeline? | Purpose |
|--------|-------------------|----------------------|---------|
| `boundary.py` | No | Yes | Semantic detectors only |
| `candidates/` | No | Yes | Sliding windows + TLV structure |
| `constraints/stage1.py` | No | Yes | Statistical constraints |
| `constraints/stage2.py` | No | Yes | Bit-use + position probabilities |
| `cluster.py` | No | Yes | Value-based grouping |
| `metrics.py` | No | Yes | H/C/V on labels (labels from eval only) |
| `io/loader.py` | Partially (L2–L4 only) | Yes | Generic packet parsing (not app-layer) |
| `io/sessions.py` | No | Yes | Direction/pair assignment (ports/IPs only) |
| `eval/ground_truth.py` | **Yes** | No | Evaluation/truth checking only |
| `catalog.py` | **Yes** | No | Dataset true-keyword registry |
| `api_runner.py` / `cli.py` | **Yes** (indirectly) | No | CLI/API orchestration + eval |

---

## Conclusion

RPKClust's core pipeline is **fully protocol-agnostic**. It does not use any application-layer protocol knowledge (Modbus function codes, DNP3 headers, DHCP options, etc.) during boundary detection, candidate generation, constraint inference, or clustering. All protocol-specific knowledge is confined to evaluation and truth-checking modules (`eval/ground_truth.py`, `catalog.py`, `api_runner.py`, `cli.py`), which are explicitly outside the pipeline's analysis stages.
