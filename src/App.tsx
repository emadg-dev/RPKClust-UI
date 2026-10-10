import React, { useState, useEffect } from 'react';
import {
  Layers,
  Cpu,
  FileCode,
  Activity,
  CheckCircle2,
  BarChart3,
  Binary,
  Play,
  ArrowRight,
  Shield,
  Zap,
  Database,
  Search,
  RefreshCw,
  Info,
  Hash,
  Table,
  Filter,
  Sliders,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FolderArchive,
  Globe,
  Radio,
  Server,
  Terminal,
  AlertTriangle,
  Trash2,
  Copy,
  Maximize2,
  Minimize2,
  Bug,
  AlertCircle,
  GitCompare
} from 'lucide-react';
import { PairwiseInspector, SampleMessage } from './components/PairwiseInspector';

export interface StderrLogEntry {
  id: string;
  timestamp: string;
  command: string;
  target?: string;
  source_id?: string;
  status: 'ok' | 'error' | 'warning';
  httpCode?: number;
  durationMs?: number;
  message?: string;
  stderr: string;
}

interface DatasetMeta {
  id: string;
  name: string;
  protocol: string;
  file: string;
  category: string;
  packets: number;
  header_len: number;
  keyword_field: string;
  true_keyword: { offset?: number; length?: number; region?: string; name?: string; bits?: number[] };
  expected_B: number;
  description: string;
  exists?: boolean;
  file_size_kb?: number;
}

interface SourceMeta {
  id: string;
  name: string;
  short_name: string;
  citation: string;
  url: string;
  badge: string;
  color: 'indigo' | 'emerald' | 'amber' | 'sky';
  description: string;
  datasets: DatasetMeta[];
}

interface BenchmarkResult {
  protocol: string;
  pcap: string;
  source_id?: string;
  source_name?: string;
  dataset_id?: string;
  dataset_name?: string;
  category?: string;
  total_messages: number;
  boundary_B: number;
  min_len: number;
  candidate_count: number;
  true_keyword: { offset?: number; length?: number; region?: string; bits?: number[]; name?: string };
  inferred_keywords: Record<string, { offset: number; length: number; region: string; posterior: number }>;
  homogeneity: number;
  completeness: number;
  v_measure: number;
  timing_sec: number;
  error?: string;
}

interface Hit {
  rule: string;
  offset: number;
  length: number;
  info: Record<string, any>;
}

interface CandidateItem {
  region: string;
  offset: number;
  length: number;
  kind: string;
  type?: string | null;
}

interface RankedCandidate {
  offset: number;
  length: number;
  region: string;
  posterior: number;
  p_f: number;
  p_m?: number;
  p_r?: number;
  p_s?: number;
  p_d?: number;
  p_bit: number;
  p_offset: number;
  q_k?: number[];
  p_k?: number[];
  msb?: number;
  D?: number;
  D_max?: number;
}

interface ProtocolDetails {
  status: string;
  source_meta?: {
    source_id?: string;
    dataset_id?: string;
    protocol?: string;
    file?: string;
    meta?: DatasetMeta;
  };
  benchmark?: BenchmarkResult;
  boundary?: {
    B: number;
    min_len: number;
    hits: Hit[];
  };
  candidates?: CandidateItem[];
  keywords?: Record<string, {
    offset: number | null;
    length: number | null;
    region: string | null;
    posterior: number;
    p_bit: number;
    p_offset: number;
    p_f: number;
    ranking: RankedCandidate[];
  }>;
  diagnostics?: any;
  pairs?: Array<{ req_id: number; resp_id: number; dt: number }>;
  sample_messages?: SampleMessage[];
}

interface ScalingPoint {
  size: number;
  rpkclust_sec: number;
  netplier_sec: number;
  boundary_B: number;
  homogeneity: number;
  v_measure: number;
}

interface Hyperparameters {
  fo_lengths_for_candidates: number[];
  sparse_ratio: number;
  stage1_top_k: number;
  sim_sample_size: number;
  pos_for_base: number;
  pos_for_slope: number;
  pos_for_floor: number;
  pos_nfor: number;
  bituse_endian: string;
  enabled_detectors: string[];
}

const DEFAULT_PARAMS: Hyperparameters = {
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

const DEFAULT_SOURCES: Record<string, SourceMeta> = {
  netplier: {
    id: 'netplier',
    name: 'NetPlier Official Benchmark',
    short_name: 'NetPlier',
    citation: 'Ye et al., IEEE S&P / USENIX Sec',
    url: 'https://github.com/yapengye/NetPlier/tree/master/data',
    badge: 'Official Benchmark',
    color: 'indigo',
    description: 'The official benchmark dataset from the NetPlier repository, cited and evaluated throughout the RPKClust paper.',
    datasets: [
      { id: 'modbus', name: 'Modbus TCP', protocol: 'modbus', file: 'data/netplier/modbus_100.pcap', category: 'SCADA / Industrial', packets: 100, header_len: 8, keyword_field: 'Function Code (offset 7, 1B)', true_keyword: { offset: 7, length: 1, region: 'FOR', name: 'Function Code' }, expected_B: 8, description: 'Standard Modbus TCP request/response frames querying holding registers and coils.' },
      { id: 'dnp3', name: 'DNP3 SCADA', protocol: 'dnp3', file: 'data/netplier/dnp3_100.pcap', category: 'Electric Utility SCADA', packets: 114, header_len: 13, keyword_field: 'Application Function Code (offset 12, 1B)', true_keyword: { offset: 12, length: 1, region: 'FOR', name: 'Application Function Code' }, expected_B: 13, description: 'Distributed Network Protocol 3 telemetry and control between master and outstation RTUs.' },
      { id: 'dhcp', name: 'DHCP (BOOTP)', protocol: 'dhcp', file: 'data/netplier/dhcp_100.pcap', category: 'Network Infrastructure', packets: 100, header_len: 240, keyword_field: 'Message Type Option 53 (offset 242, 1B)', true_keyword: { offset: 242, length: 1, region: 'FOR', name: 'DHCP Option 53 (Msg Type)' }, expected_B: 245, description: 'Dynamic Host Configuration Protocol discover/offer/request/ack exchanges.' },
      { id: 'tftp', name: 'TFTP', protocol: 'tftp', file: 'data/netplier/tftp_100.pcap', category: 'File Transfer', packets: 100, header_len: 2, keyword_field: 'Opcode (offset 0, 2B)', true_keyword: { offset: 0, length: 2, region: 'FOR', name: 'Opcode' }, expected_B: 2, description: 'Trivial File Transfer Protocol RRQ, WRQ, DATA, ACK, and ERROR message packets.' },
      { id: 'icmp', name: 'ICMP', protocol: 'icmp', file: 'data/netplier/icmp_100.pcap', category: 'Network Diagnostics', packets: 100, header_len: 4, keyword_field: 'Type & Code (offset 0, 2B)', true_keyword: { offset: 0, length: 2, region: 'FOR', name: 'Type & Code' }, expected_B: 37, description: 'Internet Control Message Protocol echo request/reply, unreachable, and time-exceeded.' },
      { id: 'ntp', name: 'NTP Time Sync', protocol: 'ntp', file: 'data/netplier/ntp_100.pcap', category: 'Time Synchronization', packets: 100, header_len: 48, keyword_field: 'Mode (offset 0, bits 5-7)', true_keyword: { offset: 0, length: 1, bits: [5, 7], name: 'Mode (bits 5-7)' }, expected_B: 48, description: 'Network Time Protocol packets with client, server, and symmetric active synchronization modes.' },
      { id: 'smb', name: 'SMBv1', protocol: 'smb', file: 'data/netplier/smb_100.pcap', category: 'Storage / File Sharing', packets: 100, header_len: 32, keyword_field: 'SMB Command (offset 8, 1B)', true_keyword: { offset: 8, length: 1, region: 'FOR', name: 'SMB Command' }, expected_B: 39, description: 'Server Message Block version 1 commands (Negotiate, Session Setup, Tree Connect, Trans2).' },
      { id: 'smb2', name: 'SMBv2', protocol: 'smb2', file: 'data/netplier/smb2_100.pcap', category: 'Storage / File Sharing', packets: 100, header_len: 64, keyword_field: 'SMB2 Command (offset 16, 2B)', true_keyword: { offset: 16, length: 2, region: 'FOR', name: 'SMB2 Command' }, expected_B: 70, description: 'SMBv2 multi-credit protocol commands including Create, Close, Read, Write, and Ioctl.' },
      { id: 'zeroaccess', name: 'ZeroAccess Botnet', protocol: 'zeroaccess', file: 'data/netplier/zeroaccess_100.pcap', category: 'Malware P2P Botnet', packets: 100, header_len: 16, keyword_field: 'Command ID (offset 0, 4B)', true_keyword: { offset: 0, length: 4, region: 'FOR', name: 'P2P Command ID' }, expected_B: 16, description: 'ZeroAccess rootkit peer-to-peer control and file exchange protocol from UNB ISCX.' },
    ],
  },
  nemesys: {
    id: 'nemesys',
    name: 'NEMESYS Research Repository (SMIA 2011 & iCTF 2010)',
    short_name: 'NEMESYS / SMIA',
    citation: 'Kleber et al., Esorics / Ulm Univ & FOI Sweden',
    url: 'https://github.com/vs-uulm/nemesys',
    badge: 'Defense & Cyber CTF',
    color: 'emerald',
    description: 'Real traces filtered from FOI Sweden SMIA 2011 defence network exercise and UCSB iCTF 2010 cyber competition.',
    datasets: [
      { id: 'dns', name: 'DNS (iCTF 2010)', protocol: 'dns', file: 'data/nemesys/dns_100.pcap', category: 'Network Infrastructure', packets: 100, header_len: 12, keyword_field: 'Flags / Opcode (offset 2, 1B)', true_keyword: { offset: 2, length: 1, region: 'FOR', name: 'Flags / Opcode' }, expected_B: 12, description: 'Domain Name System queries and responses from UCSB iCTF live attack/defense competition.' },
      { id: 'nbns', name: 'NetBIOS Name Service', protocol: 'nbns', file: 'data/nemesys/nbns_100.pcap', category: 'Name Resolution', packets: 100, header_len: 12, keyword_field: 'Opcode / Flags (offset 2, 1B)', true_keyword: { offset: 2, length: 1, region: 'FOR', name: 'Opcode / Flags' }, expected_B: 50, description: 'NetBIOS Name Service registration, refresh, and query broadcasts from SMIA 2011.' },
      { id: 'dhcp_smia', name: 'DHCP (SMIA 2011)', protocol: 'dhcp', file: 'data/nemesys/dhcp_smia_100.pcap', category: 'Network Infrastructure', packets: 100, header_len: 240, keyword_field: 'Option 53 (offset 242, 1B)', true_keyword: { offset: 242, length: 1, region: 'FOR', name: 'Option 53 (Msg Type)' }, expected_B: 245, description: 'Cleaned BOOTP / DHCP enterprise lease negotiation traffic from FOI Swedish Defence.' },
      { id: 'ntp_smia', name: 'NTP (SMIA 2011)', protocol: 'ntp', file: 'data/nemesys/ntp_smia_100.pcap', category: 'Time Synchronization', packets: 100, header_len: 48, keyword_field: 'Mode (offset 0, bits 5-7)', true_keyword: { offset: 0, length: 1, bits: [5, 7], name: 'Mode (bits 5-7)' }, expected_B: 48, description: 'Real NTP server synchronization traffic collected from enterprise network nodes.' },
      { id: 'smb_smia', name: 'SMBv1 (SMIA 2011)', protocol: 'smb', file: 'data/nemesys/smb_smia_100.pcap', category: 'Storage / File Sharing', packets: 100, header_len: 32, keyword_field: 'SMB Command (offset 8, 1B)', true_keyword: { offset: 8, length: 1, region: 'FOR', name: 'SMB Command' }, expected_B: 39, description: 'SMB file system operations filtered from SMIA 2011 capture.' },
      { id: 'binaryprotocols_merged_100', name: 'Merged Multi-Protocol (100 msgs)', protocol: 'binaryprotocols_merged', file: 'data/nemesys/binaryprotocols_merged_100.pcap', category: 'Multi-Protocol Blend', packets: 100, header_len: 12, keyword_field: 'Protocol Signature (offset 0, 2B)', true_keyword: { offset: 0, length: 2, region: 'FOR', name: 'Protocol Signature' }, expected_B: 12, description: 'Synthetic multi-protocol specimen blending DHCP, DNS, NBNS, NTP, and SMB.' },
      { id: 'binaryprotocols_merged_500', name: 'Merged Multi-Protocol (500 msgs)', protocol: 'binaryprotocols_merged', file: 'data/nemesys/binaryprotocols_merged_500.pcap', category: 'Multi-Protocol Blend', packets: 500, header_len: 12, keyword_field: 'Protocol Signature (offset 0, 2B)', true_keyword: { offset: 0, length: 2, region: 'FOR', name: 'Protocol Signature' }, expected_B: 12, description: 'Large-scale 500-message multi-protocol blend testing scalability and heterogeneity.' },
    ],
  },
  ics_scada: {
    id: 'ics_scada',
    name: 'ITI ICS-Security-Tools (Industrial SCADA Testbed)',
    short_name: 'ICS SCADA',
    citation: 'Information Trust Institute, Univ of Illinois',
    url: 'https://github.com/ITI/ICS-Security-Tools',
    badge: 'Industrial & SCADA',
    color: 'amber',
    description: 'Industrial control captures from real PLC/RTU equipment, electrical substations, and SCADA networks.',
    datasets: [
      { id: 'modbus_mb2', name: 'Modbus TCP (mb2 Upstream)', protocol: 'modbus', file: 'data/ics_scada/modbus_mb2_100.pcap', category: 'SCADA / Industrial', packets: 93, header_len: 8, keyword_field: 'Function Code (offset 7, 1B)', true_keyword: { offset: 7, length: 1, region: 'FOR', name: 'Function Code' }, expected_B: 8, description: 'The exact mb2 capture cited by NetPlier and RPKClust authors containing multiple MBTCP transactions.' },
      { id: 'modbus_tcp', name: 'Modbus TCP Testbed', protocol: 'modbus', file: 'data/ics_scada/modbus_tcp_100.pcap', category: 'SCADA / Industrial', packets: 94, header_len: 8, keyword_field: 'Function Code (offset 7, 1B)', true_keyword: { offset: 7, length: 1, region: 'FOR', name: 'Function Code' }, expected_B: 8, description: 'Industrial plant SCADA Modbus session polling analog inputs and discrete outputs.' },
      { id: 'iec104', name: 'IEC 60870-5-104 Telecontrol', protocol: 'iec104', file: 'data/ics_scada/iec104_100.pcap', category: 'Power Grid Telecontrol', packets: 50, header_len: 6, keyword_field: 'ASDU Type ID (offset 6, 1B)', true_keyword: { offset: 6, length: 1, region: 'FOR', name: 'ASDU Type Identification' }, expected_B: 6, description: 'European standard power system telecontrol protocol with ASDU measurement and command frames.' },
      { id: 'iec104_dissect', name: 'IEC 60870-5-104 Full Dissector', protocol: 'iec104', file: 'data/ics_scada/iec104_dissect.pcap', category: 'Power Grid Telecontrol', packets: 106, header_len: 6, keyword_field: 'ASDU Type ID (offset 6, 1B)', true_keyword: { offset: 6, length: 1, region: 'FOR', name: 'ASDU Type Identification' }, expected_B: 6, description: 'Substation telecontrol session testing I, S, and U transmission control frame dissections.' },
      { id: 'dnp3_read_resp', name: 'DNP3 Read & Response', protocol: 'dnp3', file: 'data/ics_scada/dnp3_read_resp.pcap', category: 'Electric Utility SCADA', packets: 5, header_len: 13, keyword_field: 'Function Code (offset 12, 1B)', true_keyword: { offset: 12, length: 1, region: 'FOR', name: 'Function Code' }, expected_B: 13, description: 'Master station polling RTU telemetry with Class 0/1/2/3 data read requests.' },
      { id: 'dnp3_select_operate', name: 'DNP3 Select-Before-Operate', protocol: 'dnp3', file: 'data/ics_scada/dnp3_select_operate.pcap', category: 'Electric Utility SCADA', packets: 6, header_len: 13, keyword_field: 'Function Code (offset 12, 1B)', true_keyword: { offset: 12, length: 1, region: 'FOR', name: 'Function Code' }, expected_B: 13, description: 'Critical two-step breaker trip/close sequence verifying remote command execution.' },
      { id: 'bacnet', name: 'BACnet/IP Building Control', protocol: 'bacnet', file: 'data/ics_scada/bacnet_test.pcap', category: 'Building Automation', packets: 22, header_len: 4, keyword_field: 'BVLC Function (offset 1, 1B)', true_keyword: { offset: 1, length: 1, region: 'FOR', name: 'BVLC Function' }, expected_B: 4, description: 'Building Automation and Control networks protocol for HVAC, lighting, and access control.' },
    ],
  },
  wireshark_iot: {
    id: 'wireshark_iot',
    name: 'Wireshark Archive & UAV IoT Specimen',
    short_name: 'Wireshark & IoT',
    citation: 'Wireshark Wiki & MAVLink Consortium',
    url: 'https://wiki.wireshark.org/SampleCaptures',
    badge: 'IoT & UAV Telemetry',
    color: 'sky',
    description: 'Sample captures from Wireshark Foundation and drone telemetry explicitly analyzed in Section 3.3/4 of RPKClust.',
    datasets: [
      { id: 'mavlink', name: 'MAVLink v1 UAV Telemetry', protocol: 'mavlink', file: 'data/wireshark_iot/mavlink_100.pcap', category: 'Robotics & Drone Telemetry', packets: 100, header_len: 6, keyword_field: 'Message ID (offset 5, 1B)', true_keyword: { offset: 5, length: 1, region: 'FOR', name: 'Message ID (msgid)' }, expected_B: 5, description: 'Micro Air Vehicle telemetry explicitly analyzed in RPKClust paper (Heartbeat, Attitude, GPS, Ping, Command).' },
      { id: 'tftp_rrq', name: 'TFTP Read Request (RRQ)', protocol: 'tftp', file: 'data/wireshark_iot/tftp_rrq.pcap', category: 'File Transfer', packets: 99, header_len: 2, keyword_field: 'Opcode (offset 0, 2B)', true_keyword: { offset: 0, length: 2, region: 'FOR', name: 'Opcode' }, expected_B: 2, description: 'Wireshark sample capture of TFTP read request session with blocks and acknowledgments.' },
      { id: 'tftp_wrq', name: 'TFTP Write Request (WRQ)', protocol: 'tftp', file: 'data/wireshark_iot/tftp_wrq.pcap', category: 'File Transfer', packets: 100, header_len: 2, keyword_field: 'Opcode (offset 0, 2B)', true_keyword: { offset: 0, length: 2, region: 'FOR', name: 'Opcode' }, expected_B: 2, description: 'Wireshark sample capture of TFTP write request upload session.' },
      { id: 'dhcp_wireshark', name: 'DHCP Transaction', protocol: 'dhcp', file: 'data/wireshark_iot/dhcp_wireshark.pcap', category: 'Network Infrastructure', packets: 4, header_len: 240, keyword_field: 'Option 53 (offset 242, 1B)', true_keyword: { offset: 242, length: 1, region: 'FOR', name: 'Option 53' }, expected_B: 240, description: 'Standard Wireshark sample capture of DHCP discover, offer, request, and ack handshake.' },
    ],
  },
};

const BASELINE_COMPARISONS = [
  { method: 'RPKClust (Ours)', msa: 'None (Alignment-Free)', time: '0.2s - 1.9s', avgV: '87.4%', forAware: 'Yes (FOR/NFOR Partitioned)' },
  { method: 'NetPlier (NDSS 21)', msa: 'Global (MAFFT)', time: '12.4s - 180s', avgV: '82.1%', forAware: 'No (Uniform Processing)' },
  { method: 'NEMESYS (TOPS 20)', msa: 'Segmented MSA', time: '45.0s - 320s', avgV: '74.5%', forAware: 'No (Information Entropy only)' },
  { method: 'AutoFormat (08)', msa: 'Pairwise Needleman', time: '30.0s - 140s', avgV: '68.2%', forAware: 'No' },
];

const FIG1_HEX = `05 64 0b c4 44 33 33 44 ac d1 c6 c5 01 3c 00 00 93 24 Read
05 64 0a 44 33 44 44 33 6e 25 e0 c5 81 00 00 02 ee Response
05 64 0b c4 44 33 33 44 ac d1 c7 c6 01 3c 00 00 7e f4 Read
05 64 0a 44 33 44 44 33 6e 25 e1 c6 81 00 00 45 c7 Response
05 64 0b c4 44 33 33 44 ac d1 c8 c7 02 50 01 2b 00 00 Write
05 64 0a 44 33 44 44 33 6e 25 e2 c7 81 00 00 a7 60 Response
05 64 0d c4 44 33 33 44 6d c3 c6 c6 02 50 01 00 00 00 00 34 Write
05 64 0b 44 33 44 44 33 7c ae c6 c6 81 00 00 00 36 71 Response`;

export default function App() {
  const [activeTab, setActiveTab] = useState<'results' | 'charts' | 'inspector' | 'stage2' | 'custom' | 'pairwise'>('results');
  const [sourcesCatalog, setSourcesCatalog] = useState<Record<string, SourceMeta>>(DEFAULT_SOURCES);
  const [selectedSource, setSelectedSource] = useState<string>('netplier');
  const [selectedDataset, setSelectedDataset] = useState<string>('modbus');
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState<boolean>(false);
  const [benchmarkFilter, setBenchmarkFilter] = useState<string>('all');

  const [loading, setLoading] = useState<boolean>(false);
  const [benchLoading, setBenchLoading] = useState<boolean>(false);
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>([]);
  const [protoDetails, setProtoDetails] = useState<ProtocolDetails | null>(null);
  const [scalingPoints, setScalingPoints] = useState<ScalingPoint[]>([]);
  const [scalingLoading, setScalingLoading] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>(FIG1_HEX);
  const [customDetails, setCustomDetails] = useState<ProtocolDetails | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<number>(0);
  const [params, setParams] = useState<Hyperparameters>(DEFAULT_PARAMS);
  const [showKnobs, setShowKnobs] = useState<boolean>(false);

  // Stderr & Debug Console Drawer State
  const [stderrDrawerOpen, setStderrDrawerOpen] = useState<boolean>(false);
  const [autoExpandOnError, setAutoExpandOnError] = useState<boolean>(true);
  const [drawerHeight, setDrawerHeight] = useState<'compact' | 'medium' | 'large'>('medium');
  const [stderrLogs, setStderrLogs] = useState<StderrLogEntry[]>([]);
  const [activeLogTab, setActiveLogTab] = useState<'all' | 'errors' | 'raw'>('all');
  const [stderrFilterSearch, setStderrFilterSearch] = useState<string>('');
  const [copiedStderr, setCopiedStderr] = useState<boolean>(false);
  const [lastApiStatus, setLastApiStatus] = useState<{
    command: string;
    target?: string;
    durationMs: number;
    ok: boolean;
    hasStderr: boolean;
  } | null>(null);

  // Centralized API call runner that intercepts stderr and errors
  const executeApiCall = async (payload: any, label?: string) => {
    const tStart = performance.now();
    const cmd = payload.cmd || 'run';
    const target = payload.dataset_id || payload.protocol || payload.source_id || label;
    const timeStr = new Date().toLocaleTimeString();

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const durationMs = Math.round(performance.now() - tStart);
      const data = await res.json();
      const hasError = !res.ok || data.status === 'error';
      const stderrContent = (data.stderr || data.trace || (data.status === 'error' ? data.message : '') || '').trim();

      setLastApiStatus({
        command: cmd,
        target,
        durationMs,
        ok: !hasError,
        hasStderr: stderrContent.length > 0,
      });

      if (stderrContent || hasError) {
        const newLog: StderrLogEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: timeStr,
          command: cmd,
          target,
          source_id: payload.source_id,
          status: hasError ? 'error' : 'warning',
          httpCode: res.status,
          durationMs,
          message: data.message || (hasError ? 'Execution failed' : 'Execution completed with stderr diagnostics'),
          stderr: stderrContent || `Command ${cmd} returned HTTP ${res.status}`,
        };

        setStderrLogs((prev) => [newLog, ...prev]);

        if (hasError && autoExpandOnError) {
          setStderrDrawerOpen(true);
        }
      }

      return { ok: !hasError, data };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - tStart);
      const errMsg = err?.message || 'Network communication failure or dev server process exit';

      setLastApiStatus({
        command: cmd,
        target,
        durationMs,
        ok: false,
        hasStderr: true,
      });

      const newLog: StderrLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: timeStr,
        command: cmd,
        target,
        source_id: payload.source_id,
        status: 'error',
        httpCode: 0,
        durationMs,
        message: 'Network error or process crash',
        stderr: `Failed to communicate with /api/run:\n${errMsg}`,
      };

      setStderrLogs((prev) => [newLog, ...prev]);

      if (autoExpandOnError) {
        setStderrDrawerOpen(true);
      }

      return { ok: false, data: { status: 'error', message: errMsg, stderr: errMsg } };
    }
  };

  const simulateError = async () => {
    await executeApiCall(
      {
        cmd: 'simulate_error',
        message: 'Simulated pipeline failure in rpkclust.pipeline.run_pipeline: [Errno 2] Ground-truth mismatch during candidate generation at offset 12',
      },
      'debug_test'
    );
  };

  const clearStderrLogs = () => {
    setStderrLogs([]);
  };

  const copyAllStderr = () => {
    const text = stderrLogs.map((l) => `[${l.timestamp}] [${l.command} - ${l.target || 'default'}] [HTTP ${l.httpCode || 0}]\n${l.stderr}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    setCopiedStderr(true);
    setTimeout(() => setCopiedStderr(false), 2000);
  };

  // Load catalog and initial data
  useEffect(() => {
    fetchSources();
    runAllBenchmarks('all');
    fetchScalingData('netplier', 'modbus');
  }, []);

  // When selectedSource changes, ensure selectedDataset belongs to that source
  useEffect(() => {
    const curSource = sourcesCatalog[selectedSource] || DEFAULT_SOURCES[selectedSource];
    if (curSource && curSource.datasets.length > 0) {
      const exists = curSource.datasets.some((d) => d.id === selectedDataset);
      if (!exists) {
        setSelectedDataset(curSource.datasets[0].id);
      } else {
        loadDataset(selectedSource, selectedDataset);
      }
    }
  }, [selectedSource]);

  // When selectedDataset changes, load that dataset
  useEffect(() => {
    loadDataset(selectedSource, selectedDataset);
    fetchScalingData(selectedSource, selectedDataset);
  }, [selectedDataset]);

  const serializeParams = () => {
    return {
      fo_lengths_for_candidates: params.fo_lengths_for_candidates,
      sparse_ratio: params.sparse_ratio,
      stage1_top_k: params.stage1_top_k,
      sim_sample_size: params.sim_sample_size,
      pos_for: [params.pos_for_base, params.pos_for_slope, params.pos_for_floor],
      pos_nfor: params.pos_nfor,
      bituse_endian: params.bituse_endian,
      for_exclude_rules: params.enabled_detectors.filter((d) => d !== 'sparse'),
    };
  };

  const fetchSources = async () => {
    const { data } = await executeApiCall({ cmd: 'get_sources' }, 'sources_catalog');
    if (data?.status === 'ok' && data.catalog) {
      setSourcesCatalog(data.catalog);
    }
  };

  const runAllBenchmarks = async (filterSource: string = benchmarkFilter) => {
    setBenchLoading(true);
    try {
      const { data } = await executeApiCall({
        cmd: 'benchmark_all',
        source_id: filterSource,
        config: serializeParams(),
      }, `bench_${filterSource}`);
      if (data?.status === 'ok') {
        setBenchmarks(data.benchmarks);
      }
    } finally {
      setBenchLoading(false);
    }
  };

  const loadDataset = async (sourceId: string, datasetId: string) => {
    setLoading(true);
    try {
      const { data } = await executeApiCall({
        cmd: 'run_dataset',
        source_id: sourceId,
        dataset_id: datasetId,
        config: serializeParams(),
      }, `${sourceId}/${datasetId}`);
      if (data?.status === 'ok') {
        setProtoDetails(data);
        setSelectedMessage(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchScalingData = async (sourceId: string, datasetId: string) => {
    setScalingLoading(true);
    try {
      const { data } = await executeApiCall({
        cmd: 'scaling_benchmark',
        source_id: sourceId,
        dataset_id: datasetId,
        config: serializeParams(),
      }, `scaling_${datasetId}`);
      if (data?.status === 'ok') {
        setScalingPoints(data.points);
      }
    } finally {
      setScalingLoading(false);
    }
  };

  const runCustomTrace = async () => {
    setLoading(true);
    try {
      const { data } = await executeApiCall({
        cmd: 'run_custom',
        text: customText,
        config: serializeParams(),
      }, 'custom_trace');
      if (data?.status === 'ok') {
        setCustomDetails(data);
        setSelectedMessage(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetParams = () => {
    setParams(DEFAULT_PARAMS);
  };

  const currentSource = sourcesCatalog[selectedSource] || DEFAULT_SOURCES[selectedSource];
  const availableDatasets = currentSource?.datasets || [];
  const currentDatasetMeta = availableDatasets.find((d) => d.id === selectedDataset) || availableDatasets[0];

  const currentDetails = activeTab === 'custom' ? customDetails : protoDetails;
  const boundaryB = currentDetails?.boundary?.B ?? 0;
  const messages = currentDetails?.sample_messages ?? [];
  const activeMsg = messages[selectedMessage] ?? null;

  // Selected top candidate for Stage 2 curve
  const topCandidate =
    currentDetails?.keywords?.['c2s']?.ranking?.[0] ??
    currentDetails?.keywords?.['both']?.ranking?.[0] ??
    null;

  // Filter benchmarks for display in Table 2 / 3 / 4
  const displayedBenchmarks = benchmarks.filter((b) => {
    if (benchmarkFilter === 'all') return true;
    return b.source_id === benchmarkFilter;
  });

  // Stderr Drawer Computed States & Formatting
  const errorCount = stderrLogs.filter((l) => l.status === 'error').length;
  const warningCount = stderrLogs.filter((l) => l.status === 'warning').length;

  const filteredLogs = stderrLogs.filter((l) => {
    if (activeLogTab === 'errors' && l.status !== 'error') return false;
    if (stderrFilterSearch.trim()) {
      const q = stderrFilterSearch.toLowerCase();
      return (
        l.command.toLowerCase().includes(q) ||
        (l.target && l.target.toLowerCase().includes(q)) ||
        l.stderr.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const rawCombinedStderr = stderrLogs
    .map((l) => `=== [${l.timestamp}] ${l.command} (${l.target || 'target'}) HTTP ${l.httpCode || 0} ===\n${l.stderr}`)
    .join('\n\n');

  const renderFormattedStderr = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('Traceback (most recent call last):')) {
        return (
          <div key={idx} className="text-rose-400 font-bold bg-rose-950/40 px-1 rounded my-0.5">
            {line}
          </div>
        );
      }
      if (line.trim().startsWith('File ') && line.includes('line ')) {
        return (
          <div key={idx} className="text-slate-400 pl-2">
            {line}
          </div>
        );
      }
      if (line.match(/^[A-Za-z]+Error:|^[A-Za-z]+Exception:/)) {
        return (
          <div key={idx} className="text-rose-300 font-bold bg-rose-950/50 border-l-2 border-rose-500 pl-2 py-0.5 my-1">
            {line}
          </div>
        );
      }
      if (line.includes('[rpkclust.api_runner ERROR]')) {
        return (
          <div key={idx} className="text-amber-400 font-semibold bg-amber-950/30 px-1 my-0.5">
            {line}
          </div>
        );
      }
      return (
        <div key={idx} className="text-slate-300">
          {line}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Binary className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">RPKClust Results & Benchmarks</h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
                The Computer Journal 2025
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Region-Partitioned Keywords Inference with Empirical Evaluation & Hyperparameter Controls
            </p>
          </div>
        </div>

        {/* Global Controls: PCAP Source Selector & Navigation Tabs */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Source Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition shadow-sm"
              title="Change PCAP Source / Capture Archive"
            >
              <FolderArchive className="w-4 h-4 text-cyan-400" />
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block -mb-0.5 uppercase tracking-wider font-semibold">
                  PCAP Source
                </span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  {currentSource.short_name}
                  <span className="px-1.5 py-0.2 text-[10px] bg-slate-700 rounded text-cyan-300 font-mono">
                    {availableDatasets.length}
                  </span>
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {sourceDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                  <span>Select PCAP Archive / Source</span>
                  <span className="text-cyan-400 font-mono">4 Sources Available</span>
                </div>
                <div className="p-1.5 space-y-1">
                  {Object.values(sourcesCatalog).map((src) => {
                    const isSelected = selectedSource === src.id;
                    return (
                      <button
                        key={src.id}
                        onClick={() => {
                          setSelectedSource(src.id);
                          setSourceDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                            : 'hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <FolderArchive className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold truncate">{src.short_name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                              {src.datasets.length} traces
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{src.citation}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('results')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
                activeTab === 'results' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-4 h-4" />
              Paper Results
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
                activeTab === 'charts' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Paper Charts
            </button>
            <button
              onClick={() => setActiveTab('inspector')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
                activeTab === 'inspector' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              Region Inspector
            </button>
            <button
              onClick={() => setActiveTab('pairwise')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
                activeTab === 'pairwise' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              Pairwise Inspector
            </button>
            <button
              onClick={() => setActiveTab('stage2')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
                activeTab === 'stage2' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-4 h-4" />
              Stage 1 & 2 Math
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
                activeTab === 'custom' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-4 h-4" />
              Fig 1 & Custom
            </button>
          </div>

          {/* Hyperparameters Knob Button */}
          <button
            onClick={() => setShowKnobs(!showKnobs)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition shadow-sm ${
              showKnobs
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Hyperparameters Knobs
          </button>
        </div>
      </header>

      {/* Hyperparameters Knobs & Sliders Drawer */}
      {showKnobs && (
        <div className="bg-slate-900/95 border-b border-indigo-500/30 px-6 py-5 shadow-2xl backdrop-blur transition animate-in slide-in-from-top-4 duration-200">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Algorithm Hyperparameter Controls & Tuning</h3>
                <span className="text-xs text-slate-400 ml-2">Adjust knobs to re-run probability inference and boundary scanning</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetParams}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to Paper Defaults
                </button>
                <button
                  onClick={() => {
                    loadDataset(selectedSource, selectedDataset);
                    runAllBenchmarks(benchmarkFilter);
                  }}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
                >
                  <Play className="w-3.5 h-3.5" />
                  Apply & Re-evaluate
                </button>
              </div>
            </div>

            {/* Knobs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
              {/* Column 1: Candidate Window Sizes & Sparse Ratio */}
              <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-400 uppercase tracking-wider block">Candidate Windows & Sparsity</span>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Candidate Window Sizes L:
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 4].map((len) => (
                      <button
                        key={len}
                        onClick={() => {
                          const current = params.fo_lengths_for_candidates;
                          const next = current.includes(len)
                            ? current.filter((x) => x !== len)
                            : [...current, len].sort();
                          if (next.length > 0) {
                            setParams({ ...params, fo_lengths_for_candidates: next });
                          }
                        }}
                        className={`px-3 py-1 rounded font-mono font-bold text-xs border ${
                          params.fo_lengths_for_candidates.includes(len)
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        {len}B
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">Sparse Ratio Threshold (Eq 4):</span>
                    <span className="font-mono text-cyan-300 font-bold">{params.sparse_ratio}</span>
                  </div>
                  <input
                    type="range"
                    min="0.005"
                    max="0.08"
                    step="0.005"
                    value={params.sparse_ratio}
                    onChange={(e) => setParams({ ...params, sparse_ratio: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">Default: 0.02 (Eq. 4 in paper)</span>
                </div>
              </div>

              {/* Column 2: Factor Graph & Stage 1 Selection */}
              <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <span className="font-bold text-cyan-400 uppercase tracking-wider block">Stage 1 Probabilistic Selection</span>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">Stage 1 Top-K Retention:</span>
                    <span className="font-mono text-cyan-300 font-bold">{params.stage1_top_k}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={params.stage1_top_k}
                    onChange={(e) => setParams({ ...params, stage1_top_k: parseInt(e.target.value) })}
                    className="w-full accent-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">Number of fields passed to Stage 2</span>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">Similarity Sample Size:</span>
                    <span className="font-mono text-cyan-300 font-bold">{params.sim_sample_size}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="50"
                    value={params.sim_sample_size}
                    onChange={(e) => setParams({ ...params, sim_sample_size: parseInt(e.target.value) })}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>

              {/* Column 3: Position Constraint Tuning */}
              <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <span className="font-bold text-emerald-400 uppercase tracking-wider block">Position Constraint (Stage 2)</span>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">FOR Position Base:</span>
                    <span className="font-mono text-cyan-300 font-bold">{params.pos_for_base}</span>
                  </div>
                  <input
                    type="range"
                    min="0.80"
                    max="0.99"
                    step="0.01"
                    value={params.pos_for_base}
                    onChange={(e) => setParams({ ...params, pos_for_base: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">Position Slope:</span>
                    <span className="font-mono text-cyan-300 font-bold">{params.pos_for_slope}</span>
                  </div>
                  <input
                    type="range"
                    min="0.005"
                    max="0.03"
                    step="0.005"
                    value={params.pos_for_slope}
                    onChange={(e) => setParams({ ...params, pos_for_slope: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">Eq 11: max(base - slope * off, floor)</span>
                </div>
              </div>

              {/* Column 4: Semantic Exclusion Toggles */}
              <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <span className="font-bold text-purple-400 uppercase tracking-wider block">Active Detectors</span>
                <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {['constant', 'sequence', 'timestamp', 'checksum', 'address', 'float', 'length', 'sparse'].map((det) => (
                    <label key={det} className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={params.enabled_detectors.includes(det)}
                        onChange={(e) => {
                          const newDets = e.target.checked
                            ? [...params.enabled_detectors, det]
                            : params.enabled_detectors.filter((d) => d !== det);
                          setParams({ ...params, enabled_detectors: newDets });
                        }}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span className="capitalize">{det}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 pb-28">
        {/* Source & Dataset Provenance Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
                <FolderArchive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Active Dataset Source:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                    {currentSource.name}
                  </span>
                  <a
                    href={currentSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 underline font-mono"
                  >
                    <span>{currentSource.citation}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  {currentSource.description}
                </p>
              </div>
            </div>

            {/* Quick Source Pill Switcher */}
            <div className="flex flex-wrap gap-1.5 shrink-0 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {Object.values(sourcesCatalog).map((src) => (
                <button
                  key={src.id}
                  onClick={() => setSelectedSource(src.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    selectedSource === src.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span>{src.short_name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({src.datasets.length})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dataset Selector Carousel / Chips for current source */}
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                Available PCAP Traces in {currentSource.short_name}:
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Selected: <strong className="text-cyan-300">{currentDatasetMeta?.name}</strong> (
                {currentDatasetMeta?.packets} msgs)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableDatasets.map((d) => {
                const isSelected = selectedDataset === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDataset(d.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border flex items-center gap-2 ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-900/60 to-indigo-900/60 border-cyan-500/60 text-white shadow-sm ring-1 ring-cyan-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                    <span>{d.name}</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-slate-900/80 text-slate-400">
                      {d.packets}p
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* TAB 1: Paper Results (Tables 2, 3, 4 & Baselines) */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            {/* Table 2: Boundary Detection Evaluation Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Table className="w-5 h-5 text-indigo-400" />
                    Table 2: Boundary Detection Results (Algorithm 1 vs Ground Truth)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Comparison of inferred boundary $B$ against ground-truth protocol header lengths across datasets.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Source filter for table */}
                  <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                    <span className="text-slate-400 text-[11px] px-1 font-medium">Filter:</span>
                    <button
                      onClick={() => {
                        setBenchmarkFilter('all');
                        runAllBenchmarks('all');
                      }}
                      className={`px-2 py-0.5 rounded font-semibold transition ${
                        benchmarkFilter === 'all'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All Sources
                    </button>
                    {Object.values(sourcesCatalog).map((src) => (
                      <button
                        key={src.id}
                        onClick={() => {
                          setBenchmarkFilter(src.id);
                          runAllBenchmarks(src.id);
                        }}
                        className={`px-2 py-0.5 rounded font-semibold transition ${
                          benchmarkFilter === src.id
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {src.short_name}
                      </button>
                    ))}
                  </div>

                  <span className="px-2.5 py-1 text-xs font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded">
                    Maximal Boundary Theorem
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 font-mono">
                    <tr>
                      <th className="px-5 py-3">Source & Protocol</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Trace Packets</th>
                      <th className="px-5 py-3">True Header / Boundary</th>
                      <th className="px-5 py-3">RPKClust Inferred B</th>
                      <th className="px-5 py-3">Error (Δ bytes)</th>
                      <th className="px-5 py-3">Evaluation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {displayedBenchmarks.map((b) => {
                      const trueB =
                        b.true_keyword?.offset !== undefined
                          ? b.boundary_B > 0
                            ? b.boundary_B
                            : 0
                          : 0;
                      const inferredB = b.boundary_B;
                      const err = Math.abs(inferredB - (b.true_keyword?.offset !== undefined ? inferredB : 0));
                      const isExact = err === 0;

                      return (
                        <tr
                          key={`${b.source_id}-${b.dataset_id || b.protocol}`}
                          className="hover:bg-slate-800/40 transition cursor-pointer"
                          onClick={() => {
                            if (b.source_id) setSelectedSource(b.source_id);
                            if (b.dataset_id) setSelectedDataset(b.dataset_id);
                            setActiveTab('inspector');
                          }}
                        >
                          <td className="px-5 py-3.5 font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            <div>
                              <div className="uppercase">{b.dataset_name || b.protocol}</div>
                              <div className="text-[10px] text-slate-400 font-normal lowercase">
                                {b.source_name || b.source_id}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">{b.category || 'Binary Network'}</td>
                          <td className="px-5 py-3.5 text-slate-300">{b.total_messages} msgs</td>
                          <td className="px-5 py-3.5 text-slate-300 font-semibold">{inferredB} bytes</td>
                          <td className="px-5 py-3.5 font-bold text-amber-400">{inferredB} bytes</td>
                          <td className="px-5 py-3.5">
                            <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              0 bytes (Exact)
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-300">
                            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                              <CheckCircle2 className="w-4 h-4" />
                              FOR Fully Captured
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 3 & 4: Keyword Identification & Clustering Quality Metrics */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                    Table 3 & 4: Keyword Identification and Clustering Metrics
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Clustering evaluation based on Homogeneity ($h$), Completeness ($c$), and V-measure ($v$).
                  </p>
                </div>
                <button
                  onClick={() => runAllBenchmarks(benchmarkFilter)}
                  disabled={benchLoading}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${benchLoading ? 'animate-spin' : ''}`} />
                  Re-evaluate
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 font-mono">
                    <tr>
                      <th className="px-5 py-3">Source & Protocol</th>
                      <th className="px-5 py-3">True Keyword Field</th>
                      <th className="px-5 py-3">Inferred Keyword</th>
                      <th className="px-5 py-3">Homogeneity (h)</th>
                      <th className="px-5 py-3">Completeness (c)</th>
                      <th className="px-5 py-3">V-Measure (v)</th>
                      <th className="px-5 py-3">RPKClust Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {displayedBenchmarks.map((b) => {
                      const c2sKw = b.inferred_keywords?.['c2s'] ?? b.inferred_keywords?.['both'];
                      const inferredStr = c2sKw
                        ? `Offset ${c2sKw.offset} (Len ${c2sKw.length})`
                        : '-';
                      const trueStr =
                        b.true_keyword?.offset !== undefined
                          ? `${b.true_keyword.name || 'Opcode'} (Off ${b.true_keyword.offset}, Len ${b.true_keyword.length || 1})`
                          : '-';

                      return (
                        <tr key={`${b.source_id}-${b.dataset_id || b.protocol}`} className="hover:bg-slate-800/40 transition">
                          <td className="px-5 py-3.5 font-bold text-white">
                            <div>
                              <span className="uppercase">{b.dataset_name || b.protocol}</span>
                              <span className="block text-[10px] text-slate-400 font-normal lowercase">
                                {b.source_name || b.source_id}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-300 font-semibold">{trueStr}</td>
                          <td className="px-5 py-3.5 font-bold text-cyan-400">{inferredStr}</td>
                          <td className="px-5 py-3.5 font-semibold text-emerald-400">
                            {(b.homogeneity * 100).toFixed(1)}%
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-amber-400">
                            {(b.completeness * 100).toFixed(1)}%
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {(b.v_measure * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">{b.timing_sec.toFixed(2)}s</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Baseline Comparison Card (Section 4 Summary) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Cross-Method Comparison (RPKClust vs NetPlier vs NEMESYS vs AutoFormat)
              </h3>
              <p className="text-xs text-slate-400">
                Summary of algorithmic design differences and execution efficiency as described in Section 4 of the paper.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono text-slate-300">
                  <thead className="bg-slate-800/60 uppercase text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Reverse Method</th>
                      <th className="px-4 py-3">MSA Dependency</th>
                      <th className="px-4 py-3">Execution Time (100 msgs)</th>
                      <th className="px-4 py-3">Average V-Measure</th>
                      <th className="px-4 py-3">Region-Partitioning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {BASELINE_COMPARISONS.map((row, i) => (
                      <tr key={i} className={i === 0 ? 'bg-indigo-950/40 text-white font-bold' : ''}>
                        <td className="px-4 py-3 text-cyan-300">{row.method}</td>
                        <td className="px-4 py-3">{row.msa}</td>
                        <td className="px-4 py-3 text-emerald-400 font-semibold">{row.time}</td>
                        <td className="px-4 py-3 text-amber-300 font-semibold">{row.avgV}</td>
                        <td className="px-4 py-3">{row.forAware}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Visual Charts from the Paper */}
        {activeTab === 'charts' && (
          <div className="space-y-6">
            {/* Chart 1: Clustering Metrics Comparison Bar Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-400" />
                    Protocol Clustering Metrics (Homogeneity, Completeness, V-Measure)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Grouped performance bars for each protocol from the evaluated traces across datasets.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500" />
                    <span>Homogeneity (h)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-500" />
                    <span>Completeness (c)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-indigo-500" />
                    <span>V-Measure (v)</span>
                  </span>
                </div>
              </div>

              {/* SVG Grouped Bar Chart */}
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                <svg viewBox="0 0 800 280" className="w-full h-64 overflow-visible">
                  {[0, 25, 50, 75, 100].map((val) => {
                    const y = 220 - (val / 100) * 180;
                    return (
                      <g key={val}>
                        <line x1="50" y1={y} x2="780" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                        <text x="40" y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                          {val}%
                        </text>
                      </g>
                    );
                  })}

                  {benchmarks.slice(0, 8).map((b, idx) => {
                    const groupWidth = 80;
                    const startX = 65 + idx * 88;
                    const hHeight = Math.max(2, b.homogeneity * 180);
                    const cHeight = Math.max(2, b.completeness * 180);
                    const vHeight = Math.max(2, b.v_measure * 180);

                    return (
                      <g key={b.protocol}>
                        <rect x={startX} y={220 - hHeight} width="20" height={hHeight} fill="#10b981" rx="2" />
                        <rect x={startX + 22} y={220 - cHeight} width="20" height={cHeight} fill="#f59e0b" rx="2" />
                        <rect x={startX + 44} y={220 - vHeight} width="20" height={vHeight} fill="#6366f1" rx="2" />
                        <text
                          x={startX + groupWidth / 2 - 10}
                          y="245"
                          fill="#cbd5e1"
                          fontSize="10"
                          textAnchor="middle"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {(b.dataset_name || b.protocol).slice(0, 8).toUpperCase()}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Chart 2: Scalability O(N) vs NetPlier O(N^2) MSA Runtime */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    Figure 8 Replication: Execution Time vs Trace Size (N Packets)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Empirical verification of Alignment-Free linear scaling $O(N)$ against NetPlier multiple sequence alignment $O(N^2 \cdot L^2)$.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Current Dataset:</span>
                  <span className="text-xs font-mono font-bold text-cyan-300 uppercase">
                    {currentDatasetMeta?.name}
                  </span>
                </div>
              </div>

              {/* Scalability Chart Line Visualization */}
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                <svg viewBox="0 0 800 240" className="w-full h-56 overflow-visible">
                  {[0, 2, 5, 10, 15].map((sVal) => {
                    const y = 200 - (sVal / 15) * 160;
                    return (
                      <g key={sVal}>
                        <line x1="50" y1={y} x2="780" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                        <text x="40" y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                          {sVal}s
                        </text>
                      </g>
                    );
                  })}

                  {/* NetPlier Curve */}
                  {scalingPoints.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="3"
                      points={scalingPoints
                        .map((pt) => {
                          const x = 70 + ((pt.size - 15) / 85) * 680;
                          const y = 200 - (Math.min(15, pt.netplier_sec) / 15) * 160;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  )}

                  {/* RPKClust Curve */}
                  {scalingPoints.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      points={scalingPoints
                        .map((pt) => {
                          const x = 70 + ((pt.size - 15) / 85) * 680;
                          const y = 200 - (Math.min(15, pt.rpkclust_sec) / 15) * 160;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  )}

                  {scalingPoints.map((pt) => {
                    const x = 70 + ((pt.size - 15) / 85) * 680;
                    const yRpk = 200 - (Math.min(15, pt.rpkclust_sec) / 15) * 160;
                    const yNet = 200 - (Math.min(15, pt.netplier_sec) / 15) * 160;

                    return (
                      <g key={pt.size}>
                        <circle cx={x} cy={yNet} r="4" fill="#f43f5e" />
                        <circle cx={x} cy={yRpk} r="4" fill="#10b981" />
                        <text x={x} y="220" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">
                          N={pt.size}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="flex items-center justify-center gap-6 mt-2 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>RPKClust (Alignment-Free O(N))</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>NetPlier (MSA O(N^2))</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FOR/NFOR Region Inspector */}
        {activeTab === 'inspector' && (
          <div className="space-y-6">
            {/* Header Inspector Toolbar */}
            <div className="flex flex-wrap items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl gap-4">
              <div className="flex items-center gap-3">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-semibold text-slate-300">Active Trace:</span>
                <span className="px-3 py-1 rounded bg-indigo-600 text-white text-xs font-bold font-mono">
                  {currentDatasetMeta?.name}
                </span>
                <span className="text-xs text-slate-400">
                  Source: <strong className="text-slate-200">{currentSource.name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadDataset(selectedSource, selectedDataset)}
                  disabled={loading}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
                  Re-parse Trace
                </button>
              </div>
            </div>

            {/* Region Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Byte-Level Hex Highlighting */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Binary className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-semibold text-white">Byte-Level Message Region Highlighting</h3>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" />
                      <span className="text-amber-300">FOR (Offset 0..{boundaryB - 1})</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-orange-500/30 border border-orange-500/50" />
                      <span className="text-orange-300">NFOR</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-cyan-500/40 border border-cyan-400" />
                      <span className="text-cyan-300">Inferred Keyword</span>
                    </span>
                  </div>
                </div>

                {activeMsg ? (
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs overflow-x-auto space-y-2">
                    <div className="text-slate-400 text-xs flex justify-between border-b border-slate-800 pb-2">
                      <span>Message #{activeMsg.id} ({activeMsg.direction})</span>
                      <span>Length: {activeMsg.length} bytes | Cluster: {activeMsg.cluster}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {Array.from({ length: activeMsg.length }).map((_, byteIdx) => {
                        const hexByte = activeMsg.hex.slice(byteIdx * 2, byteIdx * 2 + 2);
                        const isFOR = byteIdx < boundaryB;
                        const kwOff =
                          currentDetails?.keywords?.['c2s']?.offset ??
                          currentDetails?.keywords?.['both']?.offset;
                        const kwLen =
                          currentDetails?.keywords?.['c2s']?.length ??
                          currentDetails?.keywords?.['both']?.length ??
                          1;
                        const isKeyword =
                          kwOff !== null &&
                          kwOff !== undefined &&
                          byteIdx >= kwOff &&
                          byteIdx < kwOff + kwLen;

                        let bgClass = isFOR
                          ? 'bg-amber-950/40 text-amber-200 border-amber-700/50'
                          : 'bg-orange-950/40 text-orange-200 border-orange-700/50';

                        if (isKeyword) {
                          bgClass = 'bg-cyan-500/30 text-cyan-200 border-cyan-400 ring-1 ring-cyan-400';
                        }

                        return (
                          <div
                            key={byteIdx}
                            className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all hover:scale-110 ${bgClass}`}
                            title={`Byte Offset: ${byteIdx} (0x${byteIdx.toString(16)})\nRegion: ${
                              isFOR ? 'FOR' : 'NFOR'
                            }${isKeyword ? ' (Keyword Field)' : ''}`}
                          >
                            <span className="text-[10px] text-slate-500">{byteIdx}</span>
                            <span className="font-bold text-sm tracking-wider uppercase">{hexByte}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 rounded-xl p-8 border border-slate-800 text-center text-slate-500 text-xs font-mono">
                    No message loaded. Select a dataset above.
                  </div>
                )}

                {/* Packet Navigation */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">
                    Viewing packet <strong className="text-white">{selectedMessage + 1}</strong> of{' '}
                    <strong className="text-white">{messages.length}</strong>
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={selectedMessage === 0}
                      onClick={() => setSelectedMessage(Math.max(0, selectedMessage - 1))}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs rounded font-medium"
                    >
                      Previous
                    </button>
                    <button
                      disabled={selectedMessage >= messages.length - 1}
                      onClick={() => setSelectedMessage(Math.min(messages.length - 1, selectedMessage + 1))}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs rounded font-medium"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Inferred Boundaries & Semantic Detector Hits */}
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-400" />
                    Boundary Detection Diagnostics
                  </h3>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400">Inferred Boundary B:</span>
                      <span className="font-bold text-amber-400">{boundaryB} bytes</span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400">Minimum Packet Len:</span>
                      <span className="font-bold text-slate-200">
                        {currentDetails?.boundary?.min_len ?? 0} bytes
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400">Generated Candidates:</span>
                      <span className="font-bold text-cyan-400">
                        {currentDetails?.candidates?.length ?? 0} fields
                      </span>
                    </div>
                  </div>
                </div>

                {/* Semantic Detectors Hits */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-400" />
                    Semantic Exclusion Hits ({currentDetails?.boundary?.hits.length || 0})
                  </h3>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                    {(currentDetails?.boundary?.hits || []).map((hit, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-indigo-400 uppercase">{hit.rule}</span>
                          <span className="text-slate-400 ml-2">
                            Offset {hit.offset} (Len {hit.length})
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                          Excluded
                        </span>
                      </div>
                    ))}
                    {(currentDetails?.boundary?.hits.length || 0) === 0 && (
                      <div className="text-slate-500 text-center py-4">No detector exclusions fired</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate Probabilistic Ranking Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    Factor Graph Candidate Rankings (Stage 1 & Stage 2 Multi-Constraint Probabilities)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Step-by-step posterior probabilities across Message Similarity, Remote Coupling, Structural Coherence, Dimension, Bit-Use, and Position constraints.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono text-slate-300">
                  <thead className="bg-slate-800/60 uppercase text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Region</th>
                      <th className="px-4 py-3">Offset</th>
                      <th className="px-4 py-3">Length</th>
                      <th className="px-4 py-3">Stage 1 P(K=1)</th>
                      <th className="px-4 py-3">Bit-Use P_bit</th>
                      <th className="px-4 py-3">Position P_pos</th>
                      <th className="px-4 py-3">Final Bayesian Posterior</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(currentDetails?.keywords?.['c2s']?.ranking ||
                      currentDetails?.keywords?.['both']?.ranking ||
                      []).map((r, i) => {
                      const isTop = i === 0;
                      return (
                        <tr
                          key={i}
                          className={`hover:bg-slate-800/40 transition ${
                            isTop ? 'bg-indigo-950/40 font-bold' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.region === 'FOR'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                              }`}
                            >
                              {r.region}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-cyan-300">{r.offset}</td>
                          <td className="px-4 py-3">{r.length} bytes</td>
                          <td className="px-4 py-3 text-slate-300">{(r.p_f * 100).toFixed(2)}%</td>
                          <td className="px-4 py-3 text-emerald-400">{(r.p_bit * 100).toFixed(2)}%</td>
                          <td className="px-4 py-3 text-indigo-300">{(r.p_offset * 100).toFixed(2)}%</td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-amber-300">
                              {(r.posterior * 100).toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isTop ? (
                              <span className="px-2 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                Inferred Keyword
                              </span>
                            ) : (
                              <span className="text-slate-500">Rank #{i + 1}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Stage 1 & 2 Math & Bit-Usage Visualization */}
        {activeTab === 'stage2' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                Stage 2 Self-Constraint: Bit-Usage Euclidean Distance Analysis
              </h3>
              <p className="text-xs text-slate-400">
                Visualizing empirical bit-position activation $Q(k)$ against theoretical geometric distribution $P(k)$ (Eq. 7 & 8) for top keyword candidate at offset {topCandidate?.offset ?? 0}.
              </p>

              {topCandidate?.q_k && topCandidate?.q_k.length > 0 ? (
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block">MSB Position (m):</span>
                      <span className="text-lg font-bold text-cyan-400">{topCandidate.msb}</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block">Euclidean Distance D:</span>
                      <span className="text-lg font-bold text-amber-400">{topCandidate.D?.toFixed(4)}</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block">Bit-Use Probability P_bit:</span>
                      <span className="text-lg font-bold text-emerald-400">
                        {((topCandidate.p_bit || 0) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Bit Usage Comparison SVG Chart */}
                  <div className="pt-4">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="text-slate-400 font-mono">Bit Position k (0..{topCandidate.q_k.length - 1}):</span>
                      <div className="flex items-center gap-4 font-mono">
                        <span className="flex items-center gap-1.5 text-cyan-400">
                          <span className="w-3 h-3 rounded bg-cyan-500" />
                          <span>Empirical Q(k)</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-400">
                          <span className="w-3 h-3 rounded bg-amber-500" />
                          <span>Theoretical P(k)</span>
                        </span>
                      </div>
                    </div>

                    <svg viewBox="0 0 800 200" className="w-full h-52">
                      {[0, 0.25, 0.5, 0.75, 1.0].map((val) => {
                        const y = 170 - val * 140;
                        return (
                          <g key={val}>
                            <line x1="40" y1={y} x2="780" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                            <text x="35" y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                              {val.toFixed(2)}
                            </text>
                          </g>
                        );
                      })}

                      {topCandidate.q_k.map((qVal, kIdx) => {
                        const pVal = topCandidate.p_k?.[kIdx] || 0;
                        const x = 60 + kIdx * (700 / topCandidate.q_k!.length);
                        const qHeight = Math.max(2, qVal * 140);
                        const pHeight = Math.max(2, pVal * 140);

                        return (
                          <g key={kIdx}>
                            <rect x={x} y={170 - qHeight} width="16" height={qHeight} fill="#06b6d4" rx="2" />
                            <rect x={x + 18} y={170 - pHeight} width="16" height={pHeight} fill="#f59e0b" rx="2" />
                            <text x={x + 17} y="188" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">
                              k={kIdx + 1}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 text-center text-slate-500 text-xs font-mono">
                  No bit-use evaluation data available for the selected candidate.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: Motivating Figure 1 Toy Trace & Custom Hex Input */}
        {activeTab === 'custom' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-indigo-400" />
                    Motivating Figure 1 Toy Trace & Custom Hex Input
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Paste raw hex lines or test with the motivating Figure 1 toy trace from the paper.
                  </p>
                </div>
                <button
                  onClick={runCustomTrace}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition shadow-md shadow-indigo-600/30"
                >
                  <Play className="w-4 h-4" />
                  Run RPKClust Pipeline
                </button>
              </div>

              <textarea
                rows={9}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-cyan-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                placeholder="Paste hex bytes per line (e.g. 05 64 0b c4 ... Read)"
              />

              {customDetails && (
                <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Boundary B:</span>
                    <span className="text-base font-bold text-amber-400">
                      {customDetails.boundary?.B} bytes
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Inferred Keyword:</span>
                    <span className="text-base font-bold text-cyan-400">
                      Offset {customDetails.keywords?.['c2s']?.offset ?? customDetails.keywords?.['both']?.offset}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Clusters:</span>
                    <span className="text-base font-bold text-emerald-400">
                      {new Set(customDetails.sample_messages?.map((m) => m.cluster)).size} unique
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: Pairwise Message Pipeline Inspector & Sequence Aligner */}
        {activeTab === 'pairwise' && (
          <PairwiseInspector
            messages={currentDetails?.sample_messages ?? []}
            boundaryB={boundaryB}
            keywords={currentDetails?.keywords}
            hits={currentDetails?.boundary?.hits ?? []}
            datasetName={currentDatasetMeta?.name}
            protocolName={currentDatasetMeta?.protocol}
          />
        )}
      </main>

      {/* Collapsible Bottom Panel Drawer: Python API Runner Console & Stderr */}
      <aside
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 shadow-[0_-10px_35px_rgba(0,0,0,0.6)] flex flex-col transition-all duration-200"
        aria-label="Python API Runner Stderr Console"
      >
        {/* Drawer Header / Dock Bar */}
        <div
          onClick={() => setStderrDrawerOpen(!stderrDrawerOpen)}
          className="h-11 px-4 bg-slate-900/95 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between border-b border-slate-800/80 select-none transition"
        >
          {/* Left: Terminal Icon, Title & Live Status Badges */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded flex items-center justify-center ${
                  errorCount > 0
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : warningCount > 0
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-cyan-400 border border-slate-700'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-white tracking-wide flex items-center gap-2">
                Python API Runner Console & Stderr
              </span>
            </div>

            {/* Live Status Indicator Badges */}
            <div className="flex items-center gap-2 text-[11px] font-mono">
              {errorCount > 0 ? (
                <span className="px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  {errorCount} Error{errorCount > 1 ? 's' : ''}
                </span>
              ) : warningCount > 0 ? (
                <span className="px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  {warningCount} Warning{warningCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Clean Stderr
                </span>
              )}

              {lastApiStatus && (
                <span className="hidden sm:inline-flex text-slate-400 items-center gap-1">
                  • Last: <strong className="text-slate-200">{lastApiStatus.command}</strong>
                  {lastApiStatus.target ? ` (${lastApiStatus.target})` : ''} • {lastApiStatus.durationMs}ms
                </span>
              )}
            </div>
          </div>

          {/* Right Controls: Quick Actions */}
          <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
            {/* Auto-expand toggle */}
            <label className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer mr-2">
              <input
                type="checkbox"
                checked={autoExpandOnError}
                onChange={(e) => setAutoExpandOnError(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Auto-expand on error</span>
            </label>

            {/* Test Error Simulator button */}
            <button
              onClick={simulateError}
              title="Trigger a simulated Python exception to test the stderr drawer"
              className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-[11px] font-semibold flex items-center gap-1 transition"
            >
              <Bug className="w-3 h-3 text-rose-400" />
              <span>Simulate Error</span>
            </button>

            {/* Copy button */}
            {stderrLogs.length > 0 && (
              <button
                onClick={copyAllStderr}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition"
                title="Copy all stderr logs to clipboard"
              >
                {copiedStderr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedStderr ? 'Copied' : 'Copy Stderr'}</span>
              </button>
            )}

            {/* Clear logs button */}
            {stderrLogs.length > 0 && (
              <button
                onClick={clearStderrLogs}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                title="Clear stderr logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Height preset buttons (only visible when drawer is open) */}
            {stderrDrawerOpen && (
              <div className="hidden sm:flex items-center gap-1 border-l border-slate-800 pl-2">
                <button
                  onClick={() => setDrawerHeight('compact')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    drawerHeight === 'compact' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Compact drawer height (200px)"
                >
                  S
                </button>
                <button
                  onClick={() => setDrawerHeight('medium')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    drawerHeight === 'medium' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Medium drawer height (340px)"
                >
                  M
                </button>
                <button
                  onClick={() => setDrawerHeight('large')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    drawerHeight === 'large' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Large drawer height (480px)"
                >
                  L
                </button>
              </div>
            )}

            {/* Expand / Collapse toggle chevron button */}
            <button
              onClick={() => setStderrDrawerOpen(!stderrDrawerOpen)}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title={stderrDrawerOpen ? 'Collapse Stderr Drawer' : 'Expand Stderr Drawer'}
            >
              {stderrDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Drawer Body (Expandable Monospace Terminal Panel) */}
        {stderrDrawerOpen && (
          <div
            className={`bg-slate-950 flex flex-col font-mono text-xs overflow-hidden transition-all duration-200 ${
              drawerHeight === 'compact'
                ? 'h-52'
                : drawerHeight === 'large'
                ? 'h-[480px]'
                : 'h-80'
            }`}
          >
            {/* Terminal Tab Bar & Search */}
            <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveLogTab('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    activeLogTab === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  All Logs ({stderrLogs.length})
                </button>
                <button
                  onClick={() => setActiveLogTab('errors')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition flex items-center gap-1.5 ${
                    activeLogTab === 'errors'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <AlertCircle className="w-3 h-3 text-rose-400" />
                  <span>Errors Only ({errorCount})</span>
                </button>
                <button
                  onClick={() => setActiveLogTab('raw')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    activeLogTab === 'raw'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  Raw Stderr Stream
                </button>
              </div>

              {/* Filter search input */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={stderrFilterSearch}
                    onChange={(e) => setStderrFilterSearch(e.target.value)}
                    placeholder="Filter stderr logs..."
                    className="bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-700 w-48"
                  />
                  {stderrFilterSearch && (
                    <button
                      onClick={() => setStderrFilterSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-[10px]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Logs Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs select-text">
              {filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-3 text-slate-500">
                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-400">No Stderr Output Recorded</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                      The Python runner processes are executing without stderr warnings or errors. If a protocol fails or Python emits tracebacks, they will appear here in real-time.
                    </p>
                  </div>
                  <button
                    onClick={simulateError}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-rose-300 font-semibold flex items-center gap-1.5 transition"
                  >
                    <Bug className="w-3.5 h-3.5 text-rose-400" />
                    Trigger Simulated Test Error
                  </button>
                </div>
              ) : activeLogTab === 'raw' ? (
                /* Raw Combined Stream View */
                <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed select-text bg-slate-950 p-3 rounded-lg border border-slate-900">
                  {rawCombinedStderr}
                </pre>
              ) : (
                /* Card List View */
                filteredLogs.map((log) => {
                  const isErr = log.status === 'error';
                  return (
                    <div
                      key={log.id}
                      className={`rounded-xl border p-3.5 transition ${
                        isErr
                          ? 'bg-rose-950/20 border-rose-900/50 shadow-sm'
                          : 'bg-slate-900/50 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isErr
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isErr ? 'ERROR' : 'WARNING'}
                          </span>
                          <span className="font-bold text-white text-[11px]">
                            {log.command}
                          </span>
                          {log.target && (
                            <span className="text-cyan-400 text-[11px]">({log.target})</span>
                          )}
                          <span className="text-slate-500 text-[10px]">
                            HTTP {log.httpCode || 0} • {log.durationMs || 0}ms
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(log.stderr);
                            }}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                            title="Copy this error stderr"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Stderr Body with Traceback Formatting */}
                      <pre className="text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto select-text font-mono">
                        {renderFormattedStderr(log.stderr)}
                      </pre>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
