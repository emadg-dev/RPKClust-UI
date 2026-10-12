import React from 'react';
import { Zap } from 'lucide-react';
import { BaselineComparison } from '../types';

interface BaselineComparisonCardProps {
  rpkAvgV: string | null;
  baselines: BaselineComparison[];
}

export default function BaselineComparisonCard({ rpkAvgV, baselines }: BaselineComparisonCardProps) {
  return (
    <div className="panel p-6 space-y-4">
      <h3 className="font-bold text-hi text-base flex items-center gap-2">
        <Zap className="w-5 h-5 text-amber" />
        Cross-Method Comparison (RPKClust vs NetPlier vs AutoFormat)
      </h3>
      <p className="text-xs text-low">
        Summary of algorithmic design differences and execution efficiency.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono text-mid">
          <thead className="thead">
            <tr>
              <th className="px-4 py-3">Reverse Method</th>
              <th className="px-4 py-3">MSA Dependency</th>
              <th className="px-4 py-3">Execution Time (100 msgs)</th>
              <th className="px-4 py-3">Average V-Measure</th>
              <th className="px-4 py-3">Region-Partitioning</th>
            </tr>
          </thead>
          <tbody className="tbody">
            {baselines.map((row, i) => (
              <tr key={i} className={i === 0 ? 'bg-accent-dark-wash text-hi font-bold' : ''}>
                <td className="px-4 py-3 text-cyan-soft">{row.method}</td>
                <td className="px-4 py-3">{row.msa}</td>
                <td className="px-4 py-3 text-emerald font-semibold">{row.time}</td>
                <td className="px-4 py-3 text-amber-soft font-semibold">
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
