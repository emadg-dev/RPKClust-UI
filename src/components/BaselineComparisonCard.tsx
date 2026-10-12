import React from 'react';
import { Zap } from 'lucide-react';
import { BaselineComparison } from '../types';

interface BaselineComparisonCardProps {
  rpkAvgV: string | null;
  baselines: BaselineComparison[];
}

export default function BaselineComparisonCard({ rpkAvgV, baselines }: BaselineComparisonCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <h3 className="font-bold text-white text-base flex items-center gap-2">
        <Zap className="w-5 h-5 text-amber-400" />
        Cross-Method Comparison (RPKClust vs NetPlier vs AutoFormat)
      </h3>
      <p className="text-xs text-slate-400">
        Summary of algorithmic design differences and execution efficiency.
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
            {baselines.map((row, i) => (
              <tr key={i} className={i === 0 ? 'bg-indigo-950/40 text-white font-bold' : ''}>
                <td className="px-4 py-3 text-cyan-300">{row.method}</td>
                <td className="px-4 py-3">{row.msa}</td>
                <td className="px-4 py-3 text-emerald-400 font-semibold">{row.time}</td>
                <td className="px-4 py-3 text-amber-300 font-semibold">
                  {i === 0 ? (rpkAvgV ?? row.avgV) : row.avgV}
                </td>
                <td className="px-4 py-3">{row.forAware}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
