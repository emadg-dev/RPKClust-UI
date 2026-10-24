# rpkclust/io/loader.py — PCAP / Hex / CSV Loader

## parse_pcap_packets (lines 185-286)
Reads binary pcap_path; detects PCAPNG (magic `b"\x0a\x0d\x0d\x0a"`) vs classic libpcap (magic `\xa1\xb2\xc3\xd4` big / `\xd4\xc3\xb2\xa1` little). For PCAPNG: parses Enhanced Packet Block (type 6, `ts_high`, `ts_low`, cap_len), Simple Packet Block (type 2, raw_bytes). For classic: 24-byte global header; reads 16-byte packet headers (ts_sec, ts_usec, incl_len, orig_len); extracts payload. After parsing, passes raw bytes to `_parse_raw_eth_ip(raw_pkt, link_type)`.

## _parse_raw_eth_ip (lines 288-326)
Strips Ethernet → detects VLAN (0x8100/0x88A8) → inner eth_type check (0x0800 IPv4) → parses IPv4 header (ver_ihl, ihl, proto) → TCP (proto 6, sport/dport from first 4 bytes, data_offset from byte 12) or UDP (proto 17, sport/dport/ulen from first 6 bytes). Also handles Linux cooked SLL (link_type 113, proto 0x0800) and raw IP (12, 101). Returns `(src, dst, sport, dport, payload)` or None.

## load_hex_lines (lines 15-111)
Accepts path or raw string. Strips comments (lines starting `#`). Supports plain hex (tokens split by whitespace) and TSV/CSV (`ts, src, dst, sport, dport, hex_data[, label]`). Assigns synthetic endpoints (10.0.0.1:10000 ↔ 10.0.0.2:502) for plain hex; handles message IDs (`m1`, `m2`) and trailing labels; truncates odd-length hex. Creates `Message(id=idx, data=bytes.fromhex(raw_hex), ...)` with default direction `c2s`. Then assigns sessions and pairs via `assign_sessions_and_directions` and `pair_messages`. Returns `Trace`.

## load_csv (lines 114-182)
Reads CSV with `DictReader`; expects `direction`, `type`, `hex`, `Full` columns. Direction: `0` = c2s, `1` = s2c. Synthetic endpoints based on direction. Label from `type` column. Creates `Message` objects; assigns session/direction/pairs; returns `Trace`.

## load_pcap (lines 329-366)
Calls `parse_pcap_packets`. If pcap_path ends with `.txt.input` or `.hex`, delegates to `load_hex_lines`. After parsing messages (id index sequential), assigns session/direction/pairs; returns `Trace`.

## Notes
- `load_pcap` creates `Message(id=msg_idx, ...)` with direction `c2s` initially; session assignment updates it.
- `load_hex_lines` assigns alternating synthetic endpoints and directions.
- All loaders call `assign_sessions_and_directions` and `pair_messages`.
- Pure-Python, zero dependencies (only standard library + rpkclust modules).
