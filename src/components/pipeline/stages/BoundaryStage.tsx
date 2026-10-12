import React from 'react';
import { ScanLine } from 'lucide-react';
import { BoundarySummary } from '../../../types';

interface BoundaryStageProps {
  summary: BoundarySummary;
}

export default function BoundaryStage({ summary }: BoundaryStageProps) {
  const trueMatch = summary.true_B !== null && summary.true_B === summary.B;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Boundary B</span>
          <span className="text-2xl font-bold text-cyan-400 font-mono">{summary.B}</span>
        </div>
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">min_len</span>
          <span className="text-2xl font-bold text-white font-mono">{summary.min_len}</span>
        </div>
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
            True B (catalog)
          </span>
          <span className="text-2xl font-bold font-mono text-slate-300">
            {summary.true_B ?? '–'}
          </span>
          {summary.true_B !== null && (
            <span
              className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-sans ${
                trueMatch
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {trueMatch ? 'MATCH' : 'MISMATCH'}
            </span>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
          <ScanLine className="w-3.5 h-3.5 text-indigo-400" />
          Boundary hits ({summary.hits.length})
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-slate-400 text-left border-b border-slate-800">
                <th className="py-1.5 pr-4">Rule</th>
                <th className="py-1.5 pr-4">Offset</th>
                <th className="py-1.5 pr-4">Length</th>
                <th className="py-1.5">Info</th>
              </tr>
            </thead>
            <tbody>
              {summary.hits.map((h, i) => (
                <tr key={i} className="border-b border-slate-800/50 text-slate-200">
                  <td className="py-1.5 pr-4">
                    <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 rounded text-[10px]">
                      {h.rule}
                    </span>
                  </td>
                  <td className="py-1.5 pr-4">{h.offset}</td>
                  <td className="py-1.5 pr-4">{h.length}</td>
                  <td className="py-1.5 text-slate-400">
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
