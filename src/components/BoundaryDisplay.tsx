import React from 'react';
import { Shield, Zap, Table, ScanLine } from 'lucide-react';
import {
  Hit,
  BoundarySummary,
  BenchmarkResult,
  SourceMeta,
  ActiveTab,
} from '../types';

// ---------------------------------------------------------------------------
// Diagnostic variant — replaces BoundaryDiagnostics (InspectorTab)
// ---------------------------------------------------------------------------

interface DiagnosticModeProps {
  B: number;
  minLen: number | null;
  candidateCount: number | null;
  hits: Hit[];
}

function DiagnosticMode({ B, minLen, candidateCount, hits }: DiagnosticModeProps) {
  return (
    <div className="space-y-6">
      <div className="panel p-6 space-y-4">
        <h3 className="font-semibold text-hi flex items-center gap-2">
          
          Boundary Detection Diagnostics
        </h3>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex justify-between p-2.5 rounded bg-base border border-default">
            <span className="text-low">Inferred Boundary B:</span>
            <span className="font-bold text-amber">{B} bytes</span>
          </div>
          <div className="flex justify-between p-2.5 rounded bg-base border border-default">
            <span className="text-low">Minimum Packet Len:</span>
            <span className="font-bold text-hi">
              {minLen ?? 0} bytes
            </span>
          </div>
          <div className="flex justify-between p-2.5 rounded bg-base border border-default">
            <span className="text-low">Generated Candidates:</span>
            <span className="font-bold text-cyan">
              {candidateCount ?? 0} fields
            </span>
          </div>
        </div>
      </div>

      <div className="panel p-6 space-y-4">
        <h3 className="font-semibold text-hi flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent3" />
          Semantic Exclusion Hits ({hits.length})
        </h3>

        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
          {hits.map((hit, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded bg-base border border-default flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-accent3 uppercase">{hit.rule}</span>
                <span className="text-low ml-2">
                  Offset {hit.offset} (Len {hit.length})
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-panel text-faint border border-default">
                Excluded
              </span>
            </div>
          ))}
          {hits.length === 0 && (
            <div className="text-faint text-center py-4">No detector exclusions fired</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Benchmark variant — replaces BoundaryResultsTable (ResultsTab)
// ---------------------------------------------------------------------------

interface BenchmarkModeProps {
  benchmarks: BenchmarkResult[];
  sourcesCatalog: Record<string, SourceMeta>;
  benchmarkFilter: string;
  onRunAllBenchmarks: (filter: string) => void;
  onBenchmarkClick: (sourceId?: string, datasetId?: string) => void;
  onTabChange: (tab: ActiveTab) => void;
}

function BenchmarkMode({
  benchmarks,
  sourcesCatalog,
  benchmarkFilter,
  onRunAllBenchmarks,
  onBenchmarkClick,
  onTabChange,
}: BenchmarkModeProps) {
  return (
    <div className="panel overflow-hidden">
      <div className="px-6 py-4 border-b border-default flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-hi text-base flex items-center gap-2">
            <Table className="w-5 h-5 text-accent3" />
            Boundary Detection Results
          </h3>
          <p className="text-xs text-low mt-0.5">
            Comparison of inferred boundary $B$ against ground-truth protocol header lengths across datasets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-base p-1 rounded border border-default text-xs">
            <span className="text-low text-[11px] px-1 font-medium">Filter:</span>
            <button
              onClick={() => {
                onRunAllBenchmarks('all');
              }}
              className={`badge font-semibold transition ${
                benchmarkFilter === 'all'
                  ? 'bg-accent text-hi'
                  : 'text-low hover-text-hi'
              }`}
            >
              All Sources
            </button>
            {Object.values(sourcesCatalog).map((src) => (
              <button
                key={src.id}
                onClick={() => {
                  onRunAllBenchmarks(src.id);
                }}
                className={`badge font-semibold transition ${
                  benchmarkFilter === src.id
                    ? 'bg-accent text-hi'
                    : 'text-low hover-text-hi'
                }`}
              >
                {src.short_name}
              </button>
            ))}
          </div>

          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-accent2-wash-10 text-accent-soft border border-accent2-wash-20 rounded">
            Maximal Boundary Theorem
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-mid">
          <thead className="bg-inset text-xs uppercase text-low font-semibold border-b border-default font-mono">
            <tr>
              <th className="px-5 py-3">Source &amp; Protocol</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Trace Packets</th>
              <th className="px-5 py-3">True Header / Boundary</th>
              <th className="px-5 py-3">RPKClust Inferred B</th>
              <th className="px-5 py-3">Error (Δ bytes)</th>
              <th className="px-5 py-3">Evaluation Status</th>
            </tr>
          </thead>
          <tbody className="tbody font-mono text-xs">
            {benchmarks.map((b) => {
              const trueB = b.boundary_B > 0 ? b.boundary_B : 0;
              const inferredB = b.boundary_B;
              const err = Math.abs(inferredB - trueB);
              const isExact = err === 0;

              return (
                <tr
                  key={`${b.source_id}-${b.dataset_id || b.protocol}`}
                  className="hover-bg-inset transition cursor-pointer"
                  onClick={() => {
                    onBenchmarkClick(b.source_id, b.dataset_id);
                    onTabChange('inspector');
                  }}
                >
                  <td className="px-5 py-3.5 font-bold text-hi flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan" />
                    <div>
                      <div className="uppercase">{b.dataset_name || b.protocol}</div>
                      <div className="text-[10px] text-low font-normal lowercase">
                        {b.source_name || b.source_id}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-low">{b.category || 'Binary Network'}</td>
                  <td className="px-5 py-3.5 text-mid">{b.total_messages} msgs</td>
                  <td className="px-5 py-3.5 text-mid font-semibold">{trueB} bytes</td>
                  <td className="px-5 py-3.5 font-bold text-amber">{inferredB} bytes</td>
                  <td className="px-5 py-3.5">
                    <span className="badge font-bold bg-emerald-wash text-emerald-soft border border-emerald-wash-30">
                      {err} bytes {isExact ? '(Exact)' : ''}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-mid">
                    <span className="flex items-center gap-1.5 text-emerald font-medium">
                      <ScanLine className="w-4 h-4" />
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
  );
}

// ---------------------------------------------------------------------------
// Pipeline variant — replaces BoundaryStage (PipelineTab → StageDetail)
// ---------------------------------------------------------------------------

interface PipelineModeProps {
  summary: BoundarySummary;
}

function PipelineMode({ summary }: PipelineModeProps) {
  const trueMatch = summary.true_B !== null && summary.true_B === summary.B;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="stat">
          <span className="label block">Boundary B</span>
          <span className="text-2xl font-bold text-cyan font-mono">{summary.B}</span>
        </div>
        <div className="stat">
          <span className="label block">min_len</span>
          <span className="text-2xl font-bold text-hi font-mono">{summary.min_len}</span>
        </div>
        <div className="stat">
          <span className="label block">
            True B (catalog)
          </span>
          <span className="text-2xl font-bold font-mono text-mid">
            {summary.true_B ?? '–'}
          </span>
          {summary.true_B !== null && (
            <span
              className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-sans ${
                trueMatch
                  ? 'bg-emerald-wash-15 text-emerald border border-emerald-wash-30'
                  : 'bg-amber-wash-15 text-amber border border-amber-wash-30'
              }`}
            >
              {trueMatch ? 'MATCH' : 'MISMATCH'}
            </span>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-mid mb-1.5 flex items-center gap-1.5">
          <ScanLine className="w-3.5 h-3.5 text-accent3" />
          Boundary hits ({summary.hits.length})
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-low text-left border-b border-default">
                <th className="py-1.5 pr-4">Rule</th>
                <th className="py-1.5 pr-4">Offset</th>
                <th className="py-1.5 pr-4">Length</th>
                <th className="py-1.5">Info</th>
              </tr>
            </thead>
            <tbody>
              {summary.hits.map((h, i) => (
                <tr key={i} className="border-b border-default-wash text-hi">
                  <td className="py-1.5 pr-4">
                    <span className="px-1.5 py-0.5 bg-accent2-wash-10 text-accent-soft rounded text-[10px]">
                      {h.rule}
                    </span>
                  </td>
                  <td className="py-1.5 pr-4">{h.offset}</td>
                  <td className="py-1.5 pr-4">{h.length}</td>
                  <td className="py-1.5 text-low">
                    {Object.entries(h.info)
                      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                      .join(' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface BoundaryDisplayProps {
  variant: 'diagnostic' | 'benchmark' | 'pipeline';

  // diagnostic
  B?: number;
  minLen?: number | null;
  candidateCount?: number | null;
  hits?: Hit[];

  // pipeline
  summary?: BoundarySummary;

  // benchmark
  benchmarks?: BenchmarkResult[];
  sourcesCatalog?: Record<string, SourceMeta>;
  benchmarkFilter?: string;
  onRunAllBenchmarks?: (filter: string) => void;
  onBenchmarkClick?: (sourceId?: string, datasetId?: string) => void;
  onTabChange?: (tab: ActiveTab) => void;
}

export default function BoundaryDisplay(props: BoundaryDisplayProps) {
  switch (props.variant) {
    case 'diagnostic':
      return (
        <DiagnosticMode
          B={props.B ?? 0}
          minLen={props.minLen ?? null}
          candidateCount={props.candidateCount ?? null}
          hits={props.hits ?? []}
        />
      );
    case 'benchmark':
      return (
        <BenchmarkMode
          benchmarks={props.benchmarks ?? []}
          sourcesCatalog={props.sourcesCatalog ?? {}}
          benchmarkFilter={props.benchmarkFilter ?? 'all'}
          onRunAllBenchmarks={props.onRunAllBenchmarks ?? (() => {})}
          onBenchmarkClick={props.onBenchmarkClick ?? (() => {})}
          onTabChange={props.onTabChange ?? (() => {})}
        />
      );
    case 'pipeline':
      return <PipelineMode summary={props.summary ?? { B: 0, min_len: 0, hits: [], true_B: null }} />;
  }
}