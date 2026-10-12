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

// ---- Clustered Messages page (cluster_messages) ----

export interface ClusterMessage {
  id: number;
  direction: string;
  hex: string;
  length: number;
  cluster: string;
  label: string | null;
  session_id: number | null;
  ts: number;
  paired_id: number | null;
}

export interface ClusterGroup {
  key: string;
  size: number;
  c2s: number;
  s2c: number;
  labels: Record<string, number>;
  example_hex: string;
}

export interface ClusterMessagesResponse {
  status: string;
  source_id: string;
  dataset_id: string;
  protocol: string;
  total_messages: number;
  keyword: Record<string, { offset: number; length: number; region: string; posterior: number }>;
  clusters: ClusterGroup[];
  messages: ClusterMessage[];
}

export interface LastApiStatus {
  command: string;
  target?: string;
  durationMs: number;
  ok: boolean;
  hasStderr: boolean;
}

export type ActiveTab = 'results' | 'charts' | 'inspector' | 'stage2' | 'custom' | 'pairwise' | 'pipeline' | 'clusters';

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

// ---- Shared byte-viewer types (MessageByteViewer) ----

export type LensKind = 'region' | 'status' | 'tags' | 'in_S' | 'satisfaction';

export interface AlignedByte {
  index: number;
  byteA: number | null;
  byteB: number | null;
  hexA: string;
  hexB: string;
  asciiA: string;
  asciiB: string;
  type: 'match' | 'mismatch' | 'gapA' | 'gapB';
  offsetA: number | null;
  offsetB: number | null;
  isForA: boolean;
  isForB: boolean;
  hitA?: string;
  hitB?: string;
}

export interface AlignmentSummary {
  alignedLength: number;
  matches: number;
  mismatches: number;
  gaps: number;
  identityPercent: number;
  score: number;
}

// ---------------------------------------------------------------------------
// Pipeline Tracker (spec 4.1 / 4.2 / 4.3)
// ---------------------------------------------------------------------------

export type PipelineStageId =
  | 'load'
  | 'boundary'
  | 'tagging'
  | 'candidates'
  | 'stage1'
  | 'stage2'
  | 'cluster'
  | 'metrics';

export type StageStatus = 'ok' | 'error' | 'skipped' | 'warn';

export interface PipelineStage {
  id: PipelineStageId;
  name: string;
  status: StageStatus;
  ms: number;
  headline: string;
  summary: Record<string, unknown>;
  attention: string[];
  error?: string | null;
}

export interface TrueKeyword {
  offset: number;
  length: number;
  region?: string | null;
  name?: string | null;
  bits?: number[] | null;
}

export interface PipelineMeta {
  source_id: string;
  dataset_id: string;
  protocol: string;
  file: string | null;
  n_messages: number;
  true_keyword: TrueKeyword | null;
  config_fingerprint: string;
  config_nondefault: Record<string, unknown>;
}

export interface DirectionStats {
  n: number;
  min: number;
  median: number;
  max: number;
}

export interface LoadSummary {
  per_direction: Record<string, DirectionStats>;
  sessions: number;
  paired_ratio: number;
  length_hist: Array<[number, number]>;
  capture_range: [number, number];
  dropped_by_cleaning: number;
  cleaning_info: Record<string, number>;
  n_raw: number;
  file: string | null;
}

export interface BoundaryHit {
  rule: string;
  offset: number;
  length: number;
  info: Record<string, unknown>;
}

export interface BoundarySummary {
  B: number;
  min_len: number;
  hits: BoundaryHit[];
  true_B: number | null;
}

export interface TaggingSummary {
  n_hits: number;
  by_byte: Record<string, string[]>;
  multi_tag_bytes: number[];
}

export interface CandidatePoolItem {
  offset: number;
  length: number;
  region: string;
  kind: string;
  tlv_type: string | null;
  distinct: number;
  direction: string;
}

export interface CandidatesSummary {
  pool: CandidatePoolItem[];
  excluded: Record<string, string[]>;
  rescued: number[];
  S: number[];
  dropped: Record<string, number>;
  true_in_pool: boolean | null;
  for_count: number;
  nfor_count: number;
}

export interface Stage1Raw {
  p_m: number;
  p_r: number;
  p_s: number;
}

export interface Stage1Row {
  offset: number;
  length: number;
  region: string;
  kind: string;
  n_clusters: number;
  n_distinct: number;
  singletons: number;
  raw: Stage1Raw;
  p_m: number;
  p_r: number;
  p_s: number;
  p_d: number;
  p_f: number;
  rank: number;
  is_true: boolean;
}

export interface Stage1Direction {
  top_k: number;
  rows: Stage1Row[];
}

export interface BitsInfo {
  msb: number;
  D: number;
  D_max: number;
  q_k: number[];
  p_k: number[];
}

export interface Stage2Row {
  offset: number;
  length: number;
  region: string;
  p_bit: number;
  p_offset: number;
  p_f: number;
  posterior: number;
  rank: number;
  stage1_rank: number;
  is_true: boolean;
  bits: BitsInfo;
}

export interface Stage2Direction {
  winner: { offset: number; length: number } | null;
  rows: Stage2Row[];
}

export interface ClusterRow {
  key: string;
  size: number;
  examples: number[];
}

export interface ClusterDirection {
  keyword: { offset: number; length: number } | null;
  clusters: ClusterRow[];
  none: number;
  unclassified: number;
}

export interface PerClusterRow {
  cluster: string;
  size: number;
  purity: number;
  top_label: string | null;
}

export interface ConfusionRow {
  cluster: string;
  label: string;
  count: number;
}

export interface MetricsSummary {
  available: boolean;
  homogeneity: number;
  completeness: number;
  v_measure: number;
  per_cluster: PerClusterRow[];
  confusion: ConfusionRow[];
}

export type HealthSeverity = 'info' | 'warn' | 'error';

export interface HealthItem {
  id: string;
  severity: HealthSeverity;
  stage: string;
  text: string;
  data: Record<string, unknown>;
}

export interface ConsistencyMismatch {
  direction: string;
  candidate: number;
  field: string;
  pipeline: number;
  recomputed: number;
}

export interface ConsistencyInfo {
  ok: boolean;
  mismatches: ConsistencyMismatch[];
  skipped: string[];
}

export interface MessageSummary {
  id: number;
  direction: string;
  length: number;
  session_id: number;
  paired_id: number | null;
  cluster: string | null;
  label: string | null;
  head_hex: string;
}

export interface PipelineTraceResponse {
  status: string;
  meta: PipelineMeta;
  stages: PipelineStage[];
  load: LoadSummary;
  boundary: BoundarySummary;
  tagging: TaggingSummary;
  candidates: CandidatesSummary;
  stage1: Record<string, Stage1Direction>;
  stage2: Record<string, Stage2Direction>;
  cluster: Record<string, ClusterDirection>;
  metrics: MetricsSummary;
  health: HealthItem[];
  consistency: ConsistencyInfo;
  messages: MessageSummary[];
}

// ---- message_trace (spec 4.2) ----

export interface MessageInfo {
  id: number;
  direction: string;
  length: number;
  session_id: number;
  paired_id: number | null;
  label: string | null;
  hex: string;
  truncated: boolean;
}

export type ByteStatus = 'excluded' | 'rescued' | 'available' | 'not_evaluated';

export interface ByteInfo {
  offset: number;
  hex: string;
  ascii: string;
  region: 'FOR' | 'NFOR';
  beyond_min_len: boolean;
  status: ByteStatus;
  tags: string[];
  exclusion_reasons: string[];
  in_S: boolean;
  candidate_ids: number[];
}

export interface RuleEval {
  rule: string;
  offset: number;
  length: number;
  fires: boolean;
  msg_ok: boolean | null;
  blocking: boolean | null;
  fraction_ok: number;
  detail: string;
  info: Record<string, unknown>;
}

export interface SimilarityInfo {
  inner_mean: number;
  inter_mean: number;
  n_inner: number;
  n_inter: number;
  formula: string;
}

export interface CouplingInfo {
  partner_id: number | null;
  partner_value: string | null;
  partner_direction: string | null;
  cluster_pr: number;
  formula: string;
}

export interface StructureInfo {
  length: number;
  cluster_median: number;
  deviation: number;
  cluster_ps: number;
  formula: string;
}

export interface DimensionInfo {
  r_distinct: number;
  r_single: number;
  p_d: number;
}

export interface PathStage1 {
  p_m: number;
  p_r: number;
  p_s: number;
  p_d: number;
  p_f: number;
  rank: number;
}

export interface PathStage2 {
  in_top_k: boolean;
  int_value: number;
  msb: number;
  p_bit: number;
  p_offset: number;
  posterior: number;
  rank: number;
  q_k: number[];
  p_k: number[];
}

export interface CandidatePath {
  candidate_id: number;
  offset: number;
  length: number;
  region: string;
  kind: string;
  tlv_type: string | null;
  value: string | null;
  cluster_key: string | null;
  cluster_size: number;
  n_clusters: number;
  similarity: SimilarityInfo;
  coupling: CouplingInfo;
  structure: StructureInfo;
  dimension: DimensionInfo;
  stage1: PathStage1;
  stage2: PathStage2 | null;
  is_winner: boolean;
  is_true: boolean;
}

export interface FinalInfo {
  cluster: string | null;
  cluster_size: number;
  keyword: { offset: number; length: number } | null;
  label: string | null;
  cluster_pure: boolean | null;
}

export interface MessageTraceResponse {
  message: MessageInfo;
  bytes: ByteInfo[];
  rules: RuleEval[];
  offset_histograms: Record<string, Array<[string, number]>>;
  candidate_path: CandidatePath[];
  final: FinalInfo;
  status: string;
}
