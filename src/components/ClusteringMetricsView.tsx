import React from 'react';
import { BarChart3, RefreshCw, Gauge } from 'lucide-react';
import { BenchmarkResult, MetricsSummary, SourceMeta } from '../types';

// ============================================================================
// Table Variant — Protocol Inference Results
// ============================================================================

interface TableModeProps {
  benchmarks: BenchmarkResult[];
  benchLoading: boolean;
  onReEvaluate: () => void;
  sourceFilter?: string;
  sourcesCatalog?: Record<string, SourceMeta>;
  onFilterChange?: (filter: string) => void;
  msgCountFilter?: number;
  onMsgCountChange?: (count: number) => void;
}

function TableMode({ benchmarks, benchLoading, onReEvaluate, sourceFilter = 'netplier', sourcesCatalog = {}, onFilterChange, msgCountFilter, onMsgCountChange }: TableModeProps) {
  return (
    <div className="panel overflow-hidden">
      <div className="px-6 py-3 border-b border-default flex flex-wrap items-center gap-2 bg-base/50">
        <span className="text-xs text-low font-medium">Filter dataset:</span>
        
        <button
          onClick={() => onFilterChange?.('all')}
          className={`badge font-semibold text-xs px-2.5 py-0.5 rounded transition ${sourceFilter === 'all' ? 'bg-accent text-hi' : 'text-low hover-text-hi bg-base border border-default'}`}
        >
          All Sources
        </button>
        {Object.values(sourcesCatalog).map((src) => (
          <button
            key={src.id}
            onClick={() => onFilterChange?.(src.id)}
            className={`badge font-semibold text-xs px-2.5 py-0.5 rounded transition ${sourceFilter === src.id ? 'bg-accent text-hi' : 'text-low hover-text-hi bg-base border border-default'}`}
          >
            {src.short_name}
          </button>
        ))}
        {sourceFilter === 'binaryinferno' && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] text-low font-medium">Msg Count:</span>
            {[100, 500, 1000].map((count) => (
              <button
                key={count}
                onClick={() => onMsgCountChange?.(count)}
                className={`px-1.5 py-0.5 btn border text-xs font-semibold ${msgCountFilter === count ? 'bg-emerald-dark text-emerald-strong border-emerald-strong' : 'bg-base border-default text-low hover-text-hi hover-border-strong'}`}
              >
                {count} msgs
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-b border-default flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-hi text-base flex items-center gap-2">
            
            Protocol Inference Results
          </h3>
          <p className="text-xs text-low mt-0.5">
            Boundary-inferred keywords, clustering metrics (h/c/v), and inferred B per protocol trace.
          </p>
        </div>
        <button
          onClick={onReEvaluate}
          disabled={benchLoading}
          className="px-3 py-1.5 btn-primary disabled:opacity-50 text-hi text-xs font-semibold rounded flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${benchLoading ? 'animate-spin' : ''}`} />
          Re-evaluate
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-mid min-w-[900px]">
          <thead className="bg-inset text-xs uppercase text-low font-semibold border-b border-default font-mono">
            <tr>
              {['Source / Protocol', 'True Keyword', 'Inferred Keyword', 'Keyword Error', 'Boundary B', 'Homogeneity h', 'Completeness c', 'V-Measure v', 'Time (s)'].map((label, i) => (
                <th
                  key={i}
                  className="px-3 py-3 "
                  style={{ minWidth: 120, maxWidth: 240 }}
                >
                  <div className="flex items-center gap-1">
                    <span>{label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tbody font-mono text-xs">
            {benchmarks.map((b) => {
              const c2sKw = b.inferred_keywords?.['c2s'] ?? b.inferred_keywords?.['both'];
              const inferredStr = c2sKw ? `Offset ${c2sKw.offset} (Len ${c2sKw.length})` : '-';
              const trueStr = b.true_keyword?.offset !== undefined ? `${b.true_keyword.name || 'Opcode'} (Off ${b.true_keyword.offset}, Len ${b.true_keyword.length || 1})` : '-';
              const trueOff = b.true_keyword?.offset;
              const trueLen = b.true_keyword?.length ?? 1;
              let kwErr: { text: string; cls: string } | null = null;
              if (trueOff !== undefined && c2sKw) {
                const offErr = c2sKw.offset - trueOff;
                const lenErr = c2sKw.length - trueLen;
                if (offErr === 0 && lenErr === 0) {
                  kwErr = { text: '0 bytes (Exact)', cls: 'bg-emerald-wash text-emerald-soft border border-emerald-wash-30' };
                } else if (offErr === 0) {
                  kwErr = { text: `0 bytes (len Δ${lenErr > 0 ? '+' : ''}${lenErr})`, cls: 'bg-amber-wash text-amber-soft border border-amber-wash-30' };
                } else {
                  const lenSuffix = lenErr !== 0 ? ` · len Δ${lenErr > 0 ? '+' : ''}${lenErr}` : '';
                  kwErr = { text: `${Math.abs(offErr)} bytes${lenSuffix}`, cls: 'bg-rose-wash text-rose-soft border border-rose-wash-30' };
                }
              }
              return (
                <tr key={`${b.source_id}-${b.dataset_id || b.protocol}`} className="hover-bg-inset transition">
                  <td className="px-3 py-3 font-bold text-hi">
                    <div><span className="uppercase">{b.dataset_name || b.protocol}</span><span className="block text-[10px] text-low font-normal lowercase">{b.source_name || b.source_id}</span></div>
                  </td>
                  <td className="px-3 py-3 text-mid font-semibold">{trueStr}</td>
                  <td className="px-3 py-3 font-bold text-cyan">{inferredStr}</td>
                  <td className="px-3 py-3">{kwErr ? <span className={`badge font-bold ${kwErr.cls}`}>{kwErr.text}</span> : <span className="text-low">–</span>}</td>
                  <td className="px-3 py-3 font-bold text-amber">{b.boundary_B ?? b.min_len ?? '-'} bytes</td>
                  <td className="px-3 py-3 font-semibold text-emerald">{(b.homogeneity * 100).toFixed(1)}%</td>
                  <td className="px-3 py-3 font-semibold text-amber">{(b.completeness * 100).toFixed(1)}%</td>
                  <td className="px-3 py-3"><span className="badge font-bold bg-accent2-wash text-accent-soft border border-accent2-wash-30">{(b.v_measure * 100).toFixed(1)}%</span></td>
                  <td className="px-3 py-3 text-low">{b.timing_sec.toFixed(2)}s</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Chart Variant
// ============================================================================

function ChartVariant({ benchmarks }: { benchmarks: BenchmarkResult[] }) {
  return (
    <div className="space-y-6">
      <div className="panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-hi text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent3" />
              Protocol Clustering Metrics (Homogeneity, Completeness, V-Measure)
            </h3>
            <p className="text-xs text-low mt-0.5">Grouped performance bars for each protocol from the evaluated traces.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald2" /><span>Homogeneity (h)</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber2" /><span>Completeness (c)</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-accent2" /><span>V-Measure (v)</span></span>
          </div>
        </div>
        <div className="bg-base p-6 rounded border border-default">
          <svg viewBox="0 0 800 280" className="w-full h-64 overflow-visible">
            {[0, 25, 50, 75, 100].map((val) => {
              const y = 220 - (val / 100) * 180;
              return (
                <g key={val}>
                  <line x1="50" y1={y} x2="780" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                  <text x="40" y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">{val}%</text>
                </g>
              );
            })}
            {benchmarks.slice(0, 8).map((b, idx) => {
              const groupWidth = 80;
              const startX = 65 + idx * 88;
              const hHeight = Math.max(2, (b.homogeneity || 0) * 180);
              const cHeight = Math.max(2, (b.completeness || 0) * 180);
              const vHeight = Math.max(2, (b.v_measure || 0) * 180);
              return (
                <g key={b.protocol}>
                  <rect x={startX} y={220 - hHeight} width="20" height={hHeight} fill="#10b981" rx="2" />
                  <rect x={startX + 22} y={220 - cHeight} width="20" height={cHeight} fill="#f59e0b" rx="2" />
                  <rect x={startX + 44} y={220 - vHeight} width="20" height={vHeight} fill="#6366f1" rx="2" />
                  <text x={startX + groupWidth / 2 - 10} y="245" fill="#cbd5e1" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">{(b.dataset_name || b.protocol).slice(0, 8).toUpperCase()}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Pipeline Variant
// ============================================================================

function PipelineVariant({ metrics }: { metrics: MetricsSummary }) {
  if (!metrics.available) {
    return <p className="text-xs text-faint">Metrics unavailable: no ground-truth labels in this capture.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="stat"><span className="label block">Homogeneity</span><span className="text-xl font-bold text-cyan font-mono">{(metrics.homogeneity * 100).toFixed(1)}%</span></div>
        <div className="stat"><span className="label block">Completeness</span><span className="text-xl font-bold text-cyan font-mono">{(metrics.completeness * 100).toFixed(1)}%</span></div>
        <div className="stat"><span className="label block">V-measure</span><span className="text-xl font-bold text-emerald font-mono">{(metrics.v_measure * 100).toFixed(1)}%</span></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-mid mb-1.5 flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-accent3" />Per-cluster purity</h4>
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-panel"><tr className="text-low text-left border-b border-default"><th className="py-1.5 pr-3">Cluster</th><th className="py-1.5 pr-3">Size</th><th className="py-1.5 pr-3">Purity</th><th className="py-1.5">Top label</th></tr></thead>
              <tbody>{metrics.per_cluster.map((c) => (<tr key={c.cluster} className="border-b border-default-wash text-hi"><td className="py-1.5 pr-3 text-cyan-soft">{c.cluster}</td><td className="py-1.5 pr-3">{c.size}</td><td className="py-1.5 pr-3">{(c.purity * 100).toFixed(1)}%</td><td className="py-1.5">{c.top_label ?? '–'}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-mid mb-1.5">Confusion (cluster × label)</h4>
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-panel"><tr className="text-low text-left border-b border-default"><th className="py-1.5 pr-3">Cluster</th><th className="py-1.5 pr-3">Label</th><th className="py-1.5">Count</th></tr></thead>
              <tbody>{metrics.confusion.map((c, i) => (<tr key={i} className="border-b border-default-wash text-hi"><td className="py-1.5 pr-3 text-cyan-soft">{c.cluster}</td><td className="py-1.5 pr-3">{c.label}</td><td className="py-1.5">{c.count}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component Export
// ============================================================================

interface ClusteringMetricsViewProps {
  variant: 'table' | 'chart' | 'pipeline';
  benchmarks?: BenchmarkResult[];
  benchLoading?: boolean;
  onReEvaluate?: () => void;
  sourceFilter?: string;
  sourcesCatalog?: Record<string, SourceMeta>;
  onFilterChange?: (filter: string) => void;
  msgCountFilter?: number;
  onMsgCountChange?: (count: number) => void;
  metrics?: MetricsSummary;
}

export default function ClusteringMetricsView(props: ClusteringMetricsViewProps) {
  switch (props.variant) {
    case 'table':
      return <TableMode benchmarks={props.benchmarks ?? []} benchLoading={props.benchLoading ?? false} onReEvaluate={props.onReEvaluate ?? (() => {})} sourceFilter={props.sourceFilter} sourcesCatalog={props.sourcesCatalog} onFilterChange={props.onFilterChange} msgCountFilter={props.msgCountFilter} onMsgCountChange={props.onMsgCountChange} />;
    case 'chart':
      return <ChartVariant benchmarks={props.benchmarks ?? []} />;
    case 'pipeline':
      return <PipelineVariant metrics={props.metrics ?? { available: false, homogeneity: 0, completeness: 0, v_measure: 0, per_cluster: [], confusion: [] }} />;
    default:
      return null;
  }
}
