import React from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { BenchmarkResult } from '../types';

interface ClusteringMetricsTableProps {
  benchmarks: BenchmarkResult[];
  benchLoading: boolean;
  onReEvaluate: () => void;
}

export default function ClusteringMetricsTable({ benchmarks, benchLoading, onReEvaluate }: ClusteringMetricsTableProps) {
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
