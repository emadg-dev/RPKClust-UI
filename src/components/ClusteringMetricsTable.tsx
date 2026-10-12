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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Keyword Identification and Clustering Metrics
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Clustering evaluation based on Homogeneity ($h$), Completeness ($c$), and V-measure ($v$).
          </p>
        </div>
        <button
          onClick={onReEvaluate}
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
              <th className="px-5 py-3">Source &amp; Protocol</th>
              <th className="px-5 py-3">True Keyword Field</th>
              <th className="px-5 py-3">Inferred Keyword</th>
              <th className="px-5 py-3">Homogeneity (h)</th>
              <th className="px-5 py-3">Completeness (c)</th>
              <th className="px-5 py-3">V-Measure (v)</th>
              <th className="px-5 py-3">RPKClust Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
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
  );
}
