import React from 'react';
import { BarChart3 } from 'lucide-react';
import { BenchmarkResult } from '../../types';

interface ChartsTabProps {
  benchmarks: BenchmarkResult[];
}

export default function ChartsTab({ benchmarks }: ChartsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              Protocol Clustering Metrics (Homogeneity, Completeness, V-Measure)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Grouped performance bars for each protocol from the evaluated traces across datasets.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span>Homogeneity (h)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span>Completeness (c)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500" />
              <span>V-Measure (v)</span>
            </span>
          </div>
        </div>

        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
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
              const hHeight = Math.max(2, b.homogeneity * 180);
              const cHeight = Math.max(2, b.completeness * 180);
              const vHeight = Math.max(2, b.v_measure * 180);

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
