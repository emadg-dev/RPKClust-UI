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
        <div className="stat">
          <span className="label block">Sessions</span>
          <span className="text-lg font-bold text-hi font-mono">{summary.sessions}</span>
        </div>
        <div className="stat">
          <span className="label block">Paired ratio</span>
          <span className="text-lg font-bold text-cyan font-mono">
            {(summary.paired_ratio * 100).toFixed(1)}%
          </span>
        </div>
        <div className="stat">
          <span className="label block">Raw msgs</span>
          <span className="text-lg font-bold text-hi font-mono">{summary.n_raw}</span>
        </div>
        <div className="stat">
          <span className="label block">Dropped by cleaning</span>
          <span className="text-lg font-bold text-amber font-mono">
            {summary.dropped_by_cleaning}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-low text-left border-b border-default">
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
                <tr key={d} className="border-b border-default-wash text-hi">
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
        <h4 className="text-xs font-semibold text-mid mb-1.5 flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5 text-accent3" />
          Length histogram
        </h4>
        <div className="flex items-end gap-1 h-20 bg-base rounded border border-default p-2 overflow-x-auto">
          {summary.length_hist.map(([len, cnt]) => {
            const maxCnt = Math.max(...summary.length_hist.map(([, c]) => c));
            const h = Math.max(2, (cnt / maxCnt) * 64);
            return (
              <div key={len} className="flex flex-col items-center gap-0.5 shrink-0"
                title={`len=${len}: ${cnt} msgs`}>
                <div className="w-3 bg-accent2-wash-80 rounded-sm" style={{ height: h }} />
                <span className="text-[9px] text-faint font-mono">{len}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-low space-y-1">
        <div>
          Capture range:{' '}
          <span className="font-mono text-mid">
            {summary.capture_range[0].toFixed(3)} – {summary.capture_range[1].toFixed(3)}
          </span>
        </div>
        <div>
          Cleaning:{' '}
          <span className="font-mono text-mid">
            {Object.entries(summary.cleaning_info)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')}
          </span>
        </div>
      </div>
    </div>
  );
}
