import { SourceMeta, Hyperparameters, BaselineComparison } from '../types';

export const DEFAULT_PARAMS: Hyperparameters = {
  fo_lengths_for_candidates: [1, 2, 4],
  sparse_ratio: 0.02,
  stage1_top_k: 5,
  sim_sample_size: 200,
  pos_for_base: 0.95,
  pos_for_slope: 0.01,
  pos_for_floor: 0.70,
  pos_nfor: 0.60,
  bituse_endian: 'big',
  enabled_detectors: ['constant', 'sequence', 'timestamp', 'float', 'length', 'checksum', 'address', 'sparse'],
};

export const DEFAULT_SOURCES: Record<string, SourceMeta> = {
  netplier: {
    id: 'netplier',
    name: 'NetPlier Official Benchmark',
    short_name: 'NetPlier',
    citation: 'Ye et al., IEEE S&P / USENIX Sec',
    url: 'https://github.com/yapengye/NetPlier/tree/master/data',
    badge: 'Official Benchmark',
    color: 'indigo',
    description: 'The official benchmark dataset from the NetPlier repository.',
    datasets: [
      { id: 'modbus', name: 'Modbus TCP', protocol: 'modbus', file: 'data/netplier/modbus_100.pcap', category: 'SCADA / Industrial', packets: 100, header_len: 8, keyword_field: 'Function Code (offset 7, 1B)', true_keyword: { offset: 7, length: 1, region: 'FOR', name: 'Function Code' }, expected_B: 8, description: 'Standard Modbus TCP request/response frames querying holding registers and coils.' },
      { id: 'dnp3', name: 'DNP3 SCADA', protocol: 'dnp3', file: 'data/netplier/dnp3_100.pcap', category: 'Electric Utility SCADA', packets: 114, header_len: 13, keyword_field: 'Application Function Code (offset 12, 1B)', true_keyword: { offset: 12, length: 1, region: 'FOR', name: 'Application Function Code' }, expected_B: 13, description: 'Distributed Network Protocol 3 telemetry and control between master and outstation RTUs.' },
      { id: 'dhcp', name: 'DHCP (BOOTP)', protocol: 'dhcp', file: 'data/netplier/dhcp_100.pcap', category: 'Network Infrastructure', packets: 100, header_len: 240, keyword_field: 'Message Type Option 53 (offset 242, 1B)', true_keyword: { offset: 242, length: 1, region: 'FOR', name: 'DHCP Option 53 (Msg Type)' }, expected_B: 245, description: 'Dynamic Host Configuration Protocol discover/offer/request/ack exchanges.' },
      { id: 'tftp', name: 'TFTP', protocol: 'tftp', file: 'data/netplier/tftp_100.pcap', category: 'File Transfer', packets: 100, header_len: 2, keyword_field: 'Opcode (offset 0, 2B)', true_keyword: { offset: 0, length: 2, region: 'FOR', name: 'Opcode' }, expected_B: 2, description: 'Trivial File Transfer Protocol RRQ, WRQ, DATA, ACK, and ERROR message packets.' },
      { id: 'ntp', name: 'NTP Time Sync', protocol: 'ntp', file: 'data/netplier/ntp_100.pcap', category: 'Time Synchronization', packets: 100, header_len: 48, keyword_field: 'Mode (offset 0, bits 5-7)', true_keyword: { offset: 0, length: 1, bits: [5, 7], name: 'Mode (bits 5-7)' }, expected_B: 48, description: 'Network Time Protocol packets with client, server, and symmetric active synchronization modes.' },
      { id: 'smb', name: 'SMBv1', protocol: 'smb', file: 'data/netplier/smb_100.pcap', category: 'Storage / File Sharing', packets: 100, header_len: 32, keyword_field: 'SMB Command (offset 8, 1B)', true_keyword: { offset: 8, length: 1, region: 'FOR', name: 'SMB Command' }, expected_B: 39, description: 'Server Message Block version 1 commands (Negotiate, Session Setup, Tree Connect, Trans2).' },
      { id: 'smb2', name: 'SMBv2', protocol: 'smb2', file: 'data/netplier/smb2_100.pcap', category: 'Storage / File Sharing', packets: 100, header_len: 64, keyword_field: 'SMB2 Command (offset 16, 2B)', true_keyword: { offset: 16, length: 2, region: 'FOR', name: 'SMB2 Command' }, expected_B: 70, description: 'SMBv2 multi-credit protocol commands including Create, Close, Read, Write, and Ioctl.' },
    ],
  },
  icsreal: {
    id: 'icsreal',
    name: 'Real ICS Traffic',
    short_name: 'ICS Real',
    citation: 'ICS-Security-Tools',
    url: 'https://github.com/ICS-Security-Tools',
    badge: 'Real ICS',
    color: 'sky',
    description: 'Real ICS protocol captures from the ICS-Security-Tools repository and other public traffic sources, covering all 7 supported protocols with larger, more diverse message volumes.',
    datasets: [
      { id: 'modbus', name: 'Modbus TCP (Real)', protocol: 'modbus', file: 'data/icsreal/modbus.pcap', category: 'SCADA / Industrial', packets: 4901, header_len: 8, keyword_field: 'Function Code (offset 7, 1B)', true_keyword: { offset: 7, length: 1, region: 'FOR', name: 'Function Code' }, expected_B: 8, description: 'Real Modbus TCP traffic with diverse function codes from ICS-Security-Tools.' },
      { id: 'dnp3', name: 'DNP3 SCADA (Real)', protocol: 'dnp3', file: 'data/icsreal/dnp3.pcap', category: 'Electric Utility SCADA', packets: 198, header_len: 13, keyword_field: 'Application Function Code (offset 12, 1B)', true_keyword: { offset: 12, length: 1, region: 'FOR', name: 'Application Function Code' }, expected_B: 12, description: 'Real DNP3 telemetry and control traffic between master and outstation RTUs.' },
      { id: 'dhcp', name: 'DHCP (Real)', protocol: 'dhcp', file: 'data/icsreal/dhcp.pcap', category: 'Network Infrastructure', packets: 100, header_len: 240, keyword_field: 'Message Type Option 53 (offset 242, 1B)', true_keyword: { offset: 242, length: 1, region: 'FOR', name: 'DHCP Option 53 (Msg Type)' }, expected_B: 240, description: 'Real DHCP discover/offer/request/ack exchanges.' },
      { id: 'tftp', name: 'TFTP (Real)', protocol: 'tftp', file: 'data/icsreal/tftp.pcap', category: 'File Transfer', packets: 100, header_len: 2, keyword_field: 'Opcode (offset 0, 2B)', true_keyword: { offset: 0, length: 2, region: 'FOR', name: 'Opcode' }, expected_B: 1, description: 'Real TFTP RRQ, WRQ, DATA, ACK, and ERROR message packets.' },
      { id: 'ntp', name: 'NTP Time Sync (Real)', protocol: 'ntp', file: 'data/icsreal/ntp.pcap', category: 'Time Synchronization', packets: 100, header_len: 48, keyword_field: 'Mode (offset 0, bits 5-7)', true_keyword: { offset: 0, length: 1, bits: [5, 7], name: 'Mode (bits 5-7)' }, expected_B: 48, description: 'Real NTP packets with client, server, and symmetric active synchronization modes.' },
      { id: 'smb', name: 'SMBv1 (Real)', protocol: 'smb', file: 'data/icsreal/smb.pcap', category: 'Storage / File Sharing', packets: 100, header_len: 32, keyword_field: 'SMB Command (offset 8, 1B)', true_keyword: { offset: 8, length: 1, region: 'FOR', name: 'SMB Command' }, expected_B: 32, description: 'Real SMBv1 commands (Negotiate, Session Setup, Tree Connect, Trans2).' },
      { id: 'smb2', name: 'SMBv2 (Real)', protocol: 'smb2', file: 'data/icsreal/smb2.pcap', category: 'Storage / File Sharing', packets: 100, header_len: 64, keyword_field: 'SMB2 Command (offset 16, 2B)', true_keyword: { offset: 16, length: 1, region: 'FOR', name: 'SMB2 Command' }, expected_B: 64, description: 'Real SMBv2 multi-credit protocol commands including Create, Close, Read, Write, and Ioctl.' },
    ],
  },
};

export const BASELINE_COMPARISONS: BaselineComparison[] = [
  { method: 'RPKClust (Ours)', msa: 'None (Alignment-Free)', time: '0.2s - 1.9s', avgV: '', forAware: 'Yes (FOR/NFOR Partitioned)' },
  { method: 'NetPlier (NDSS 21)', msa: 'Global (MAFFT)', time: '12.4s - 180s', avgV: '82.1%', forAware: 'No (Uniform Processing)' },
  { method: 'AutoFormat (08)', msa: 'Pairwise Needleman', time: '30.0s - 140s', avgV: '68.2%', forAware: 'No' },
];

export const FIG1_HEX = `05 64 0b c4 44 33 33 44 ac d1 c6 c5 01 3c 00 00 93 24 Read
05 64 0a 44 33 44 44 33 6e 25 e0 c5 81 00 00 02 ee Response
05 64 0b c4 44 33 33 44 ac d1 c7 c6 01 3c 00 00 7e f4 Read
05 64 0a 44 33 44 44 33 6e 25 e1 c6 81 00 00 45 c7 Response
05 64 0b c4 44 33 33 44 ac d1 c8 c7 02 50 01 2b 00 00 Write
05 64 0a 44 33 44 44 33 6e 25 e2 c7 81 00 00 a7 60 Response
05 64 0d c4 44 33 33 44 6d c3 c6 c6 02 50 01 00 00 00 00 34 Write
05 64 0b 44 33 44 44 33 7c ae c6 c6 81 00 00 00 36 71 Response`;
