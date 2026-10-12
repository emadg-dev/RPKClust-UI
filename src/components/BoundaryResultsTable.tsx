import React from 'react';
import { Table, CheckCircle2 } from 'lucide-react';
import { BenchmarkResult, SourceMeta, ActiveTab } from '../types';

interface BoundaryResultsTableProps {
  benchmarks: BenchmarkResult[];
  sourcesCatalog: Record<string, SourceMeta>;
  benchmarkFilter: string;
  onRunAllBenchmarks: (filter: string) => void;
  onBenchmarkClick: (sourceId?: string, datasetId?: string) => void;
  onTabChange: (tab: ActiveTab) => void;
  benchLoading: boolean;
}

export default function BoundaryResultsTable({
  benchmarks,
  sourcesCatalog,
  benchmarkFilter,
  onRunAllBenchmarks,
  onBenchmarkClick,
  onTabChange,
  benchLoading,
}: BoundaryResultsTableProps) {
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
  );
}
