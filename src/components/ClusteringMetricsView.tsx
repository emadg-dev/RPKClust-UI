import React from 'react';
import { BarChart3, RefreshCw, Gauge } from 'lucide-react';
import { BenchmarkResult, MetricsSummary } from '../types';

// ---------------------------------------------------------------------------
// Table variant — replaces ClusteringMetricsTable (ResultsTab)
// ---------------------------------------------------------------------------

interface TableModeProps {
  benchmarks: BenchmarkResult[];
  benchLoading: boolean;
  onReEvaluate: () => void;
}

function TableMode({ benchmarks, benchLoading, onReEvaluate }: TableModeProps) {
  return (
    <div className="panel overflow-hidden">
      <div className="px-6 py-4 border-b border-default flex items-center justify-between">
        <div>
          <h3 className="font-bold text-hi text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald" />
            Keyword Identification and Clustering Metrics
          </h3>
          <p className="text-xs text-low mt-0.5">
            Clustering evaluation based on Homogeneity ($h$), Completeness ($c$), and V-measure ($v$).
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
        <table className="w-full text-left text-sm text-mid">
          <thead className="bg-inset text-xs uppercase text-low font-semibold border-b border-default font-mono">
            <tr>
              <th className="px-5 py-3">Source &amp; Protocol</th>
              <th className="px-5 py-3">True Keyword Field</th>
              <th className="px-5 py-3">Inferred Keyword</th>
              <th className="px-5 py-3">Homogeneity (h)</th>
              <th className="px-5 py-3">Completeness (c)</th>
              <th className="px-5 py-3">V-Measure (v)</th>
              <th className="px-5 py-3">RPKClust Time</th>
            </tr>
          </thead>
          <tbody className="tbody font-mono text-xs">
            {benchmarks.map((b) => {
              const c2sKw = b.inferred_keywords?.['c2s'] ?? b.inferred_keywords?.['both'];
              const inferredStr = c2sKw
                ? `Offset ${c2sKw.offset} (Len ${c2sKw.length})`
                : '-';
              const trueStr =
                b.true_keyword?.offset !== undefined
                  ? `${b.true_keyword.name || 'Opcode'} (Off ${b.true_keyword.offset}, Len ${b.true_keyword.length || 1})`
                  : '-';

              return (
                <tr key={`${b.source_id}-${b.dataset_id || b.protocol}`} className="hover-bg-inset transition">
                  <td className="px-5 py-3.5 font-bold text-hi">
                    <div>
                      <span className="uppercase">{b.dataset_name || b.protocol}</span>
                      <span className="block text-[10px] text-low font-normal lowercase">
                        {b.source_name || b.source_id}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-mid font-semibold">{trueStr}</td>
                  <td className="px-5 py-3.5 font-bold text-cyan">{inferredStr}</td>
                  <td className="px-5 py-3.5 font-semibold text-emerald">
                    {(b.homogeneity * 100).toFixed(1)}%
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-amber">
                    {(b.completeness * 100).toFixed(1)}%
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="badge font-bold bg-accent2-wash text-accent-soft border border-accent2-wash-30">
                      {(b.v_measure * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-low">{b.timing_sec.toFixed(2)}s</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart variant — replaces ChartsTab
// ---------------------------------------------------------------------------

interface ChartModeProps {
  benchmarks: BenchmarkResult[];
}

function ChartMode({ benchmarks }: ChartModeProps) {
  return (
    <div className="space-y-6">
      <div className="panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-hi text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent3" />
              Protocol Clustering Metrics (Homogeneity, Completeness, V-Measure)
            </h3>
            <p className="text-xs text-low mt-0.5">
              Grouped performance bars for each protocol from the evaluated traces across datasets.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald2" />
              <span>Homogeneity (h)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber2" />
              <span>Completeness (c)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-accent2" />
              <span>V-Measure (v)</span>
            </span>
          </div>
        </div>

        <div className="bg-base p-6 rounded border border-default">
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
              const hHeight = Math.max(2, (b.homogeneity || 0) * 180);
              const cHeight = Math.max(2, (b.completeness || 0) * 180);
              const vHeight = Math.max(2, (b.v_measure || 0) * 180);

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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline variant — replaces MetricsStage (PipelineTab → StageDetail)
// ---------------------------------------------------------------------------

interface PipelineModeProps {
  metrics: MetricsSummary;
}

function PipelineMode({ metrics }: PipelineModeProps) {
  if (!metrics.available) {
    return (
      <p className="text-xs text-faint">
        Metrics unavailable: no ground-truth labels in this capture (labels are
        display-only and never feed back into the algorithm).
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="stat">
          <span className="label block">Homogeneity</span>
          <span className="text-xl font-bold text-cyan font-mono">
            {(metrics.homogeneity * 100).toFixed(1)}%
          </span>
        </div>
        <div className="stat">
          <span className="label block">Completeness</span>
          <span className="text-xl font-bold text-cyan font-mono">
            {(metrics.completeness * 100).toFixed(1)}%
          </span>
        </div>
        <div className="stat">
          <span className="label block">V-measure</span>
          <span className="text-xl font-bold text-emerald font-mono">
            {(metrics.v_measure * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-mid mb-1.5 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-accent3" />
            Per-cluster purity
          </h4>
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-panel">
                <tr className="text-low text-left border-b border-default">
                  <th className="py-1.5 pr-3">Cluster</th>
                  <th className="py-1.5 pr-3">Size</th>
                  <th className="py-1.5 pr-3">Purity</th>
                  <th className="py-1.5">Top label</th>
                </tr>
              </thead>
              <tbody>
                {metrics.per_cluster.map((c) => (
                  <tr key={c.cluster} className="border-b border-default-wash text-hi">
                    <td className="py-1.5 pr-3 text-cyan-soft">{c.cluster}</td>
                    <td className="py-1.5 pr-3">{c.size}</td>
                    <td className="py-1.5 pr-3">{(c.purity * 100).toFixed(1)}%</td>
                    <td className="py-1.5">{c.top_label ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-mid mb-1.5">Confusion (cluster × label)</h4>
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-panel">
                <tr className="text-low text-left border-b border-default">
                  <th className="py-1.5 pr-3">Cluster</th>
                  <th className="py-1.5 pr-3">Label</th>
                  <th className="py-1.5">Count</th>
                </tr>
              </thead>
              <tbody>
                {metrics.confusion.map((c, i) => (
                  <tr key={i} className="border-b border-default-wash text-hi">
                    <td className="py-1.5 pr-3 text-cyan-soft">{c.cluster}</td>
                    <td className="py-1.5 pr-3">{c.label}</td>
                    <td className="py-1.5">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ClusteringMetricsViewProps {
  variant: 'table' | 'chart' | 'pipeline';

  // table & chart
  benchmarks?: BenchmarkResult[];

  // table
  benchLoading?: boolean;
  onReEvaluate?: () => void;

  // pipeline
  metrics?: MetricsSummary;
}

export default function ClusteringMetricsView(props: ClusteringMetricsViewProps) {
  switch (props.variant) {
    case 'table':
      return (
        <TableMode
          benchmarks={props.benchmarks ?? []}
          benchLoading={props.benchLoading ?? false}
          onReEvaluate={props.onReEvaluate ?? (() => {})}
        />
      );
    case 'chart':
      return <ChartMode benchmarks={props.benchmarks ?? []} />;
    case 'pipeline':
      return (
        <PipelineMode
          metrics={
            props.metrics ??
            { available: false, homogeneity: 0, completeness: 0, v_measure: 0, per_cluster: [], confusion: [] }
          }
        />
      );
  }
}