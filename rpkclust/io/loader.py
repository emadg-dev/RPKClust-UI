"""
Data loading module for RPKClust. Supports PCAP/PCAPNG files, hex-lines, and CNN-pre CSV.
"""

import os
import re
import csv as _csv
import struct
import socket
from typing import List, Tuple, Optional
from rpkclust.model import Message, Trace
from rpkclust.config import Config
from rpkclust.io.sessions import assign_sessions_and_directions, pair_messages

def load_hex_lines(file_or_content: str, config: Optional[Config] = None) -> Trace:
    """
    Load messages from hex-lines format.
    Supports:
    1. Plain hex string per line (with optional trailing label name, e.g. '05 64 ... Read')
    2. TSV / CSV format: ts, src, dst, sport, dport, hex_data[, label]
    """
    if config is None:
        config = Config()

    lines = []
    if os.path.exists(file_or_content):
        with open(file_or_content, "r", encoding="utf-8", errors="ignore") as f:
            lines = [line.strip() for line in f if line.strip() and not line.strip().startswith("#")]
    else:
        lines = [line.strip() for line in file_or_content.splitlines() if line.strip() and not line.strip().startswith("#")]

    messages: List[Message] = []
    cur_time = 1000.0

    for idx, line in enumerate(lines):
        label = None
        ts = cur_time + idx * 0.1
        # Default synthetic endpoints with alternating request-response for plain hex
        if idx % 2 == 0:
            src = "10.0.0.1"
            dst = "10.0.0.2"
            sport = 10000
            dport = 502
        else:
            src = "10.0.0.2"
            dst = "10.0.0.1"
            sport = 502
            dport = 10000

        # Check if line contains tabs or commas
        if "\t" in line or ("," in line and not line.strip().endswith(",")):
            delim = "\t" if "\t" in line else ","
            parts = [p.strip() for p in line.split(delim)]
            if len(parts) >= 6:
                # Format: ts, src, dst, sport, dport, hex_data[, label]
                try:
                    ts = float(parts[0])
                    src = parts[1]
                    dst = parts[2]
                    sport = int(parts[3])
                    dport = int(parts[4])
                    raw_hex = parts[5]
                    if len(parts) >= 7:
                        label = parts[6]
                except ValueError:
                    raw_hex = parts[-1]
            else:
                raw_hex = parts[0]
        else:
            # Check for trailing label (e.g., "05 64 0b ... Read" or "m1 05 64 0b ... Read")
            line_clean = line
            # Strip optional message id like "m1", "m2"
            line_clean = re.sub(r"^[mM]\d+[\s:]+", "", line_clean).strip()
            tokens = line_clean.split()
            # If the last token is not valid hex byte (2 chars 0-9a-f), it is a label
            if tokens and not re.fullmatch(r"[0-9a-fA-F]{2}", tokens[-1]):
                label = tokens[-1]
                tokens = tokens[:-1]

            # Recombine hex tokens
            raw_hex = "".join(tokens)

        # Sanitize hex characters
        raw_hex = re.sub(r"[^0-9a-fA-F]", "", raw_hex)
        if len(raw_hex) % 2 != 0:
            raw_hex = raw_hex[:-1]
        if not raw_hex:
            continue

        payload = bytes.fromhex(raw_hex)
        msg = Message(
            id=idx,
            data=payload,
            ts=ts,
            src=src,
            dst=dst,
            sport=sport,
            dport=dport,
            direction="c2s",
            session_id=0,
            label=label,
        )
        messages.append(msg)

    # Process sessions, directions, and request-response pairs
    messages = assign_sessions_and_directions(messages, config)
    pairs = pair_messages(messages)
    t_start = min((m.ts for m in messages), default=0.0)
    t_end = max((m.ts for m in messages), default=0.0)

    return Trace(messages=messages, pairs=pairs, capture_range=(t_start, t_end))


def load_csv(csv_path: str, config: Optional[Config] = None) -> Trace:
    """
    Load messages from a CNN-pre format CSV file.
    Expected columns: direction, type, hex, Full
    - direction: "0" = client-to-server (c2s), "1" = server-to-client (s2c)
    - type: protocol-specific type tag
    - hex: hex-encoded payload bytes
    - Full: binary bit-string representation (unused)

    Synthetic endpoints are assigned based on direction. Request-response pairs
    are inferred from direction alternation.
    """
    if config is None:
        config = Config()

    messages: List[Message] = []
    cur_time = 1000.0

    with open(csv_path, "r", encoding="utf-8", errors="ignore", newline="") as f:
        reader = _csv.DictReader(f)
        for idx, row in enumerate(reader):
            direction_raw = row.get("direction", "0").strip()
            hex_str = row.get("hex", "").strip()
            type_tag = row.get("type", "").strip()

            if not hex_str:
                continue

            hex_str = re.sub(r"[^0-9a-fA-F]", "", hex_str)
            if len(hex_str) % 2 != 0:
                hex_str = hex_str[:-1]

            payload = bytes.fromhex(hex_str)
            is_client = direction_raw == "0"
            ts = cur_time + idx * 0.001

            if is_client:
                src = "10.0.0.1"
                dst = "10.0.0.2"
                sport = 10000
                dport = 502
                direction = "c2s"
            else:
                src = "10.0.0.2"
                dst = "10.0.0.1"
                sport = 502
                dport = 10000
                direction = "s2c"

            msg = Message(
                id=idx,
                data=payload,
                ts=ts,
                src=src,
                dst=dst,
                sport=sport,
                dport=dport,
                direction=direction,
                session_id=0,
                label=type_tag if type_tag else None,
            )
            messages.append(msg)

    messages = assign_sessions_and_directions(messages, config)
    pairs = pair_messages(messages)
    t_start = min((m.ts for m in messages), default=0.0)
    t_end = max((m.ts for m in messages), default=0.0)

    return Trace(messages=messages, pairs=pairs, capture_range=(t_start, t_end))


def parse_pcap_packets(pcap_path: str):
    """
    Robust PCAP and PCAPNG parser.
    Yields (ts, src, dst, sport, dport, payload).
    """
    with open(pcap_path, "rb") as f:
        magic = f.read(4)

    if magic == b"\x0a\x0d\x0d\x0a":
        # PCAPNG file format: pure-Python zero-dependency block parser
        try:
            with open(pcap_path, "rb") as pf:
                data = pf.read()
            pos = 0
            endian = "<"
            parsed_any = False
            while pos + 8 <= len(data):
                b_type, b_len = struct.unpack_from(endian + "II", data, pos)
                if b_type == 0x0A0D0D0A:
                    bom = data[pos + 8 : pos + 12]
                    endian = ">" if bom == b"\x1a\x2b\x3c\x4d" else "<"
                    b_type, b_len = struct.unpack_from(endian + "II", data, pos)
                if b_len < 12 or pos + b_len > len(data):
                    break
                if b_type == 0x00000006:  # Enhanced Packet Block
                    ts_high, ts_low, cap_len, _ = struct.unpack_from(endian + "IIII", data, pos + 12)
                    ts = ((ts_high << 32) | ts_low) / 1000000.0
                    raw_bytes = data[pos + 28 : pos + 28 + cap_len]
                    res = _parse_raw_eth_ip(raw_bytes)
                    if res:
                        src, dst, sport, dport, payload = res
                        if payload:
                            parsed_any = True
                            yield float(ts), src, dst, sport, dport, payload
                elif b_type == 0x00000002:  # Simple Packet Block
                    raw_bytes = data[pos + 12 : pos + b_len - 4]
                    res = _parse_raw_eth_ip(raw_bytes)
                    if res:
                        src, dst, sport, dport, payload = res
                        if payload:
                            parsed_any = True
                            yield 0.0, src, dst, sport, dport, payload
                pos += b_len
            if parsed_any:
                return
        except Exception:
            pass

        # Optional scapy fallback
        try:
            from scapy.utils import PcapNgReader
            r = PcapNgReader(pcap_path)
            while True:
                try:
                    pkt = r.read_packet()
                    if not pkt:
                        break
                    raw_bytes = bytes(pkt)
                    ts = getattr(pkt, "time", 0.0)
                    res = _parse_raw_eth_ip(raw_bytes)
                    if res:
                        src, dst, sport, dport, payload = res
                        if payload:
                            yield float(ts), src, dst, sport, dport, payload
                except EOFError:
                    break
        except Exception:
            pass
        return

    # Classic libpcap format
    with open(pcap_path, "rb") as f:
        ghdr = f.read(24)
        if len(ghdr) < 24:
            return

        magic = ghdr[:4]
        if magic in (b"\xa1\xb2\xc3\xd4", b"\xa1\xb2\x3c\x4d"):
            endian = ">"
        elif magic in (b"\xd4\xc3\xb2\xa1", b"\x4d\x3c\xb2\xa1"):
            endian = "<"
        else:
            return

        link_type = struct.unpack(endian + "I", ghdr[20:24])[0]

        while True:
            phdr = f.read(16)
            if len(phdr) < 16:
                break
            ts_sec, ts_usec, incl_len, orig_len = struct.unpack(endian + "IIII", phdr)
            raw_pkt = f.read(incl_len)
            if len(raw_pkt) < incl_len:
                break

            ts = float(ts_sec) + float(ts_usec) / 1e6
            res = _parse_raw_eth_ip(raw_pkt, link_type)
            if res:
                src, dst, sport, dport, payload = res
                if payload:
                    yield ts, src, dst, sport, dport, payload


def _parse_raw_eth_ip(raw_pkt: bytes, link_type: int = 1):
    """Parse link layer (including 802.1Q VLAN), IPv4, and TCP/UDP header to extract payload and endpoints."""
    ip_data = None
    if len(raw_pkt) >= 14:
        eth_type = struct.unpack(">H", raw_pkt[12:14])[0]
        if eth_type == 0x0800:  # Standard IPv4
            ip_data = raw_pkt[14:]
        elif eth_type in (0x8100, 0x88A8) and len(raw_pkt) >= 18:  # 802.1Q VLAN tagged
            inner_eth_type = struct.unpack(">H", raw_pkt[16:18])[0]
            if inner_eth_type == 0x0800:
                ip_data = raw_pkt[18:]

    if ip_data is None:
        if link_type == 113 and len(raw_pkt) >= 16:  # Linux cooked SLL
            proto = struct.unpack(">H", raw_pkt[14:16])[0]
            if proto == 0x0800:
                ip_data = raw_pkt[16:]
        elif link_type in (12, 101):  # Raw IP
            ip_data = raw_pkt

    if ip_data and len(ip_data) >= 20:
        ver_ihl = ip_data[0]
        ihl = (ver_ihl & 0x0F) * 4
        proto = ip_data[9]
        src = socket.inet_ntoa(ip_data[12:16])
        dst = socket.inet_ntoa(ip_data[16:20])

        trans_data = ip_data[ihl:]
        if proto == 6 and len(trans_data) >= 20:  # TCP
            sport, dport = struct.unpack(">HH", trans_data[0:4])
            data_offset = (trans_data[12] >> 4) * 4
            payload = trans_data[data_offset:]
            return src, dst, sport, dport, payload
        elif proto == 17 and len(trans_data) >= 8:  # UDP
            sport, dport, ulen = struct.unpack(">HHH", trans_data[0:6])
            payload = trans_data[8:ulen] if ulen <= len(trans_data) else trans_data[8:]
            return src, dst, sport, dport, payload

    return None


def load_pcap(pcap_path: str, config: Optional[Config] = None) -> Trace:
    """
    Load messages from a PCAP/PCAPNG file.
    Extracts transport layer payload (TCP/UDP) for each packet.
    """
    if config is None:
        config = Config()

    messages: List[Message] = []
    msg_idx = 0

    for ts, src, dst, sport, dport, payload in parse_pcap_packets(pcap_path):
        messages.append(
            Message(
                id=msg_idx,
                data=payload,
                ts=ts,
                src=src,
                dst=dst,
                sport=sport,
                dport=dport,
                direction="c2s",
                session_id=0,
            )
        )
        msg_idx += 1

    messages = assign_sessions_and_directions(messages, config)
    pairs = pair_messages(messages)
    t_start = min((m.ts for m in messages), default=0.0)
    t_end = max((m.ts for m in messages), default=0.0)

    return Trace(messages=messages, pairs=pairs, capture_range=(t_start, t_end))
