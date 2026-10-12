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
        <div className="stat">
          <span className="label block">Boundary B</span>
          <span className="text-2xl font-bold text-cyan font-mono">{summary.B}</span>
        </div>
        <div className="stat">
          <span className="label block">min_len</span>
          <span className="text-2xl font-bold text-hi font-mono">{summary.min_len}</span>
        </div>
        <div className="stat">
          <span className="label block">
            True B (catalog)
          </span>
          <span className="text-2xl font-bold font-mono text-mid">
            {summary.true_B ?? '–'}
          </span>
          {summary.true_B !== null && (
            <span
              className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-sans ${
                trueMatch
                  ? 'bg-emerald-wash-15 text-emerald border border-emerald-wash-30'
                  : 'bg-amber-wash-15 text-amber border border-amber-wash-30'
              }`}
            >
              {trueMatch ? 'MATCH' : 'MISMATCH'}
            </span>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-mid mb-1.5 flex items-center gap-1.5">
          <ScanLine className="w-3.5 h-3.5 text-accent3" />
          Boundary hits ({summary.hits.length})
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-low text-left border-b border-default">
                <th className="py-1.5 pr-4">Rule</th>
                <th className="py-1.5 pr-4">Offset</th>
                <th className="py-1.5 pr-4">Length</th>
                <th className="py-1.5">Info</th>
              </tr>
            </thead>
            <tbody>
              {summary.hits.map((h, i) => (
                <tr key={i} className="border-b border-default-wash text-hi">
                  <td className="py-1.5 pr-4">
                    <span className="px-1.5 py-0.5 bg-accent2-wash-10 text-accent-soft rounded text-[10px]">
                      {h.rule}
                    </span>
                  </td>
                  <td className="py-1.5 pr-4">{h.offset}</td>
                  <td className="py-1.5 pr-4">{h.length}</td>
                  <td className="py-1.5 text-low">
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
