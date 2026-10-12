import React from 'react';
import { Download } from 'lucide-react';
import { LoadSummary } from '../../../types';

interface LoadStageProps {
  summary: LoadSummary;
}

export default function LoadStage({ summary }: LoadStageProps) {
  const dirs = Object.keys(summary.per_direction);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Sessions</span>
          <span className="text-lg font-bold text-white font-mono">{summary.sessions}</span>
        </div>
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Paired ratio</span>
          <span className="text-lg font-bold text-cyan-400 font-mono">
            {(summary.paired_ratio * 100).toFixed(1)}%
          </span>
        </div>
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Raw msgs</span>
          <span className="text-lg font-bold text-white font-mono">{summary.n_raw}</span>
        </div>
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Dropped by cleaning</span>
          <span className="text-lg font-bold text-amber-400 font-mono">
            {summary.dropped_by_cleaning}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-slate-400 text-left border-b border-slate-800">
              <th className="py-1.5 pr-4">Direction</th>
              <th className="py-1.5 pr-4">Messages</th>
              <th className="py-1.5 pr-4">Min len</th>
              <th className="py-1.5 pr-4">Median</th>
              <th className="py-1.5 pr-4">Max len</th>
            </tr>
          </thead>
          <tbody>
            {dirs.map((d) => {
              const s = summary.per_direction[d];
              return (
                <tr key={d} className="border-b border-slate-800/50 text-slate-200">
                  <td className="py-1.5 pr-4 font-semibold">{d}</td>
                  <td className="py-1.5 pr-4">{s.n}</td>
                  <td className="py-1.5 pr-4">{s.min}</td>
                  <td className="py-1.5 pr-4">{s.median}</td>
                  <td className="py-1.5 pr-4">{s.max}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          Length histogram
        </h4>
        <div className="flex items-end gap-1 h-20 bg-slate-950 rounded-lg border border-slate-800 p-2 overflow-x-auto">
          {summary.length_hist.map(([len, cnt]) => {
            const maxCnt = Math.max(...summary.length_hist.map(([, c]) => c));
            const h = Math.max(2, (cnt / maxCnt) * 64);
            return (
              <div key={len} className="flex flex-col items-center gap-0.5 shrink-0"
                title={`len=${len}: ${cnt} msgs`}>
                <div className="w-3 bg-indigo-500/80 rounded-sm" style={{ height: h }} />
                <span className="text-[9px] text-slate-500 font-mono">{len}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-slate-400 space-y-1">
        <div>
          Capture range:{' '}
          <span className="font-mono text-slate-300">
            {summary.capture_range[0].toFixed(3)} – {summary.capture_range[1].toFixed(3)}
          </span>
        </div>
        <div>
          Cleaning:{' '}
          <span className="font-mono text-slate-300">
            {Object.entries(summary.cleaning_info)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')}
          </span>
        </div>
      </div>
    </div>
  );
}
