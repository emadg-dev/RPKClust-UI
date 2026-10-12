import { useMemo } from 'react';
import {
  ProtocolDetails,
  RankedCandidate,
  Hit,
  BenchmarkResult,
  MetricsSummary,
  PipelineTraceResponse,
  PipelineStage,
  MessageSummary,
  TrueKeyword,
  CandidateItem,
} from '../types';

export function useBoundaryData(protoDetails: ProtocolDetails | null) {
  return useMemo(() => {
    if (!protoDetails?.boundary) {
      return { B: 0, minLen: 0, candidateCount: 0, hits: [] as Hit[] };
    }
    return {
      B: protoDetails.boundary.B ?? 0,
      minLen: protoDetails.boundary.min_len ?? 0,
      candidateCount: protoDetails.candidates?.length ?? 0,
      hits: protoDetails.boundary.hits ?? [],
    };
  }, [protoDetails]);
}

export function useCandidateRanking(
  protoDetails: ProtocolDetails | null,
  direction: 'c2s' | 's2c' | 'both' = 'c2s'
): RankedCandidate[] {
  return useMemo(() => {
    if (!protoDetails?.keywords) return [];
    const kw = protoDetails.keywords[direction] ?? protoDetails.keywords.both;
    return kw?.ranking ?? [];
  }, [protoDetails, direction]);
}

export function useTopCandidate(
  protoDetails: ProtocolDetails | null,
  direction: 'c2s' | 's2c' | 'both' = 'c2s'
): RankedCandidate | null {
  return useMemo(() => {
    const ranking = useCandidateRanking(protoDetails, direction);
    return ranking[0] ?? null;
  }, [protoDetails, direction]);
}

export function useClusteringMetrics(benchmarks: BenchmarkResult[]) {
  return useMemo(() => {
    const valid = benchmarks.filter((b) => !b.error && b.v_measure !== undefined);
    const avgV = valid.length > 0
      ? `${(valid.reduce((sum, b) => sum + (b.v_measure || 0), 0) / valid.length * 100).toFixed(1)}%`
      : null;

    const tableData = benchmarks.map((b) => {
      const c2sKw = b.inferred_keywords?.['c2s'] ?? b.inferred_keywords?.['both'];
      const inferredStr = c2sKw
        ? `Offset ${c2sKw.offset} (Len ${c2sKw.length})`
        : '-';
      const trueStr = b.true_keyword?.offset !== undefined
        ? `${b.true_keyword.name || 'Opcode'} (Off ${b.true_keyword.offset}, Len ${b.true_keyword.length || 1})`
        : '-';

      return {
        sourceId: b.source_id,
        datasetId: b.dataset_id,
        protocol: b.dataset_name || b.protocol,
        sourceName: b.source_name || b.source_id,
        trueKeyword: trueStr,
        inferredKeyword: inferredStr,
        homogeneity: b.homogeneity,
        completeness: b.completeness,
        vMeasure: b.v_measure,
        timingSec: b.timing_sec,
        error: b.error,
      };
    });

    const chartData = benchmarks
      .filter((b) => !b.error)
      .slice(0, 8)
      .map((b, idx) => ({
        label: (b.dataset_name || b.protocol).slice(0, 8).toUpperCase(),
        homogeneity: b.homogeneity,
        completeness: b.completeness,
        vMeasure: b.v_measure,
        index: idx,
      }));

    return { tableData, chartData, avgV };
  }, [benchmarks]);
}

export function usePipelineTraceData(overview: PipelineTraceResponse) {
  return useMemo(() => {
    const stages: PipelineStage[] = overview.stages ?? [];
    const messages: MessageSummary[] = overview.messages ?? [];

    const stageMap = new Map(stages.map((s) => [s.id, s]));

    return {
      stages,
      messages,
      stageMap,
      load: overview.load,
      boundary: overview.boundary,
      tagging: overview.tagging,
      candidates: overview.candidates,
      stage1: overview.stage1,
      stage2: overview.stage2,
      cluster: overview.cluster,
      metrics: overview.metrics,
      health: overview.health,
      consistency: overview.consistency,
      meta: overview.meta,
    };
  }, [overview]);
}

export function useCandidatePool(overview: PipelineTraceResponse) {
  return useMemo(() => {
    if (!overview.candidates?.pool) return [];
    return overview.candidates.pool.map((c, idx) => ({
      ...c,
      index: idx,
      isExcluded: Object.values(overview.candidates.excluded ?? {}).flat().includes(`${c.offset}/${c.length}`),
      isRescued: overview.candidates.rescued?.includes(idx) ?? false,
    }));
  }, [overview.candidates]);
}

export function useTrueKeyword(overview: PipelineTraceResponse | null): TrueKeyword | null {
  return useMemo(() => {
    if (!overview?.meta?.true_keyword) return null;
    const tk = overview.meta.true_keyword;
    return {
      offset: tk.offset,
      length: tk.length,
      region: tk.region ?? null,
      name: tk.name ?? null,
      bits: tk.bits ?? null,
    };
  }, [overview]);
}

export function useKeywordsFromDetails(protoDetails: ProtocolDetails | null) {
  return useMemo(() => {
    if (!protoDetails?.keywords) return { c2s: null, both: null, s2c: null };
    return {
      c2s: protoDetails.keywords.c2s ?? null,
      both: protoDetails.keywords.both ?? null,
      s2c: protoDetails.keywords.s2c ?? null,
    };
  }, [protoDetails]);
}

export function useKeywordOffset(
  protoDetails: ProtocolDetails | null,
  direction: 'c2s' | 's2c' | 'both' = 'c2s'
): number | null {
  return useMemo(() => {
    const kw = protoDetails?.keywords?.[direction] ?? protoDetails?.keywords?.both;
    return kw?.offset ?? null;
  }, [protoDetails, direction]);
}

export function useKeywordLength(
  protoDetails: ProtocolDetails | null,
  direction: 'c2s' | 's2c' | 'both' = 'c2s'
): number {
  return useMemo(() => {
    const kw = protoDetails?.keywords?.[direction] ?? protoDetails?.keywords?.both;
    return kw?.length ?? 1;
  }, [protoDetails, direction]);
}

export function useStage1Data(overview: PipelineTraceResponse | null, direction: string) {
  return useMemo(() => {
    if (!overview?.stage1?.[direction]) return { topK: 0, rows: [] };
    return overview.stage1[direction];
  }, [overview, direction]);
}

export function useStage2Data(overview: PipelineTraceResponse | null, direction: string) {
  return useMemo(() => {
    if (!overview?.stage2?.[direction]) return { winner: null, rows: [] };
    return overview.stage2[direction];
  }, [overview, direction]);
}

export function useClusterData(overview: PipelineTraceResponse | null, direction: string) {
  return useMemo(() => {
    if (!overview?.cluster?.[direction]) return { keyword: null, clusters: [], none: 0, unclassified: 0 };
    return overview.cluster[direction];
  }, [overview, direction]);
}

export function useMetricsSummary(overview: PipelineTraceResponse | null): MetricsSummary | null {
  return useMemo(() => {
    if (!overview?.metrics?.available) return null;
    return overview.metrics;
  }, [overview]);
}

export function useHealthChecks(overview: PipelineTraceResponse | null) {
  return useMemo(() => {
    if (!overview?.health) return [];
    return overview.health;
  }, [overview]);
}

export function useConsistencyInfo(overview: PipelineTraceResponse | null) {
  return useMemo(() => {
    if (!overview?.consistency) return { ok: true, mismatches: [], skipped: [] };
    return overview.consistency;
  }, [overview]);
}