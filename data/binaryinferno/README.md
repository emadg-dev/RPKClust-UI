# BinaryInferno Dataset

Filtered from the BinaryInferno project datasets:
* https://github.com/binaryinferno/binaryinferno/tree/main/dataset/top-level

## Protocols (9 total, 8 shared with NetPlier/ICsReal + 1 new)

| Protocol | Category | Keyword | Offset | Length |
|---|---|---|---|---|
| BGP | Routing | Message Type | 18 | 1B |
| DHCP | Network Infrastructure | Message Type (Option 53) | 242 | 1B |
| DNP3 | Electric Utility SCADA | Application Function Code | 12 | 1B |
| MAVLink | UAV / Robotics | Message ID (v1) | 5 | 1B |
| Modbus | SCADA / Industrial | Function Code | 7 | 1B |
| NTP | Time Synchronization | Mode (bits 5-7) | 0 | 1B (bits 5-7) |
| SMB | Storage / File Sharing | SMB Command | 8 | 1B |
| SMB2 | Storage / File Sharing | SMB2 Command | 16 | 2B |

## Message Counts

Three message count groups are provided:

- **100 messages**: 8 protocols × 100 = 800 messages
- **500 messages**: 8 protocols × 500 = 4,000 messages  
- **1000 messages**: 8 protocols × 1000 = 8,000 messages

Total: 24 dataset files, 12,800 messages

## Format

Messages stored as hex strings, one per line (`.txt.input` format).

Example (BGP):
```
ffffffffffffffffffffffffffffffff001304
ffffffffffffffffffffffffffffffff001304
ffffffffffffffffffffffffffffffff00700200000059400101024002008004040000001440050400000064800e4100020110200300de201601ff00000000000000150040200300de2016012740200300de201601243f200300de201601287f200300de201601ff0000000000000012
```

## Excluded

The following protocols from the original BinaryInferno dataset were excluded per user request:
- `mirai.txt.input` - Malware traffic
- `random.txt.input` - Random data
- `randomfixed.txt.input` - Fixed random data
- `tutorial.txt.input` - Tutorial data

## Source

BinaryInferno Project: https://github.com/binaryinferno/binaryinferno