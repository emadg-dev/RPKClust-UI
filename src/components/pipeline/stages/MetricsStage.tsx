import React from 'react';
import { Gauge } from 'lucide-react';
import { MetricsSummary } from '../../../types';

interface MetricsStageProps {
  summary: MetricsSummary;
}

export default function MetricsStage({ summary }: MetricsStageProps) {
  if (!summary.available) {
    return (
      <p className="text-xs text-slate-500">
        Metrics unavailable: no ground-truth labels in this capture (labels are
        display-only and never feed back into the algorithm).
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Homogeneity</span>
          <span className="text-xl font-bold text-cyan-400 font-mono">
            {(summary.homogeneity * 100).toFixed(1)}%
          </span>
        </div>
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Completeness</span>
          <span className="text-xl font-bold text-cyan-400 font-mono">
            {(summary.completeness * 100).toFixed(1)}%
          </span>
        </div>
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">V-measure</span>
          <span className="text-xl font-bold text-emerald-400 font-mono">
            {(summary.v_measure * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
            Per-cluster purity
          </h4>
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-slate-400 text-left border-b border-slate-800">
                  <th className="py-1.5 pr-3">Cluster</th>
                  <th className="py-1.5 pr-3">Size</th>
                  <th className="py-1.5 pr-3">Purity</th>
                  <th className="py-1.5">Top label</th>
                </tr>
              </thead>
              <tbody>
                {summary.per_cluster.map((c) => (
                  <tr key={c.cluster} className="border-b border-slate-800/50 text-slate-200">
                    <td className="py-1.5 pr-3 text-cyan-300">{c.cluster}</td>
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
          <h4 className="text-xs font-semibold text-slate-300 mb-1.5">Confusion (cluster × label)</h4>
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-slate-400 text-left border-b border-slate-800">
                  <th className="py-1.5 pr-3">Cluster</th>
                  <th className="py-1.5 pr-3">Label</th>
                  <th className="py-1.5">Count</th>
                </tr>
              </thead>
              <tbody>
                {summary.confusion.map((c, i) => (
                  <tr key={i} className="border-b border-slate-800/50 text-slate-200">
                    <td className="py-1.5 pr-3 text-cyan-300">{c.cluster}</td>
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
