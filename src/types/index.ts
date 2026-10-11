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

export interface DatasetMeta {
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

export interface SourceMeta {
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

export interface BenchmarkResult {
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

export interface Hit {
  rule: string;
  offset: number;
  length: number;
  info: Record<string, any>;
}

export interface CandidateItem {
  region: string;
  offset: number;
  length: number;
  kind: string;
  type?: string | null;
}

export interface RankedCandidate {
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

export interface ProtocolDetails {
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

export interface Hyperparameters {
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

export interface SampleMessage {
  id: number;
  direction: string;
  hex: string;
  length: number;
  cluster: string;
  label?: string | null;
  session_id?: string | null;
  ts?: number;
  paired_id?: number | null;
}

export interface LastApiStatus {
  command: string;
  target?: string;
  durationMs: number;
  ok: boolean;
  hasStderr: boolean;
}

export type ActiveTab = 'results' | 'charts' | 'inspector' | 'stage2' | 'custom' | 'pairwise';

export type DrawerHeight = 'compact' | 'medium' | 'large';

export type LogTab = 'all' | 'errors' | 'raw';

export interface ApiCallResult {
  ok: boolean;
  data: any;
}

export interface BaselineComparison {
  method: string;
  msa: string;
  time: string;
  avgV: string;
  forAware: string;
}
