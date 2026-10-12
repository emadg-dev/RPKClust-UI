import React from 'react';
import { ListFilter } from 'lucide-react';
import { CandidatesSummary } from '../../../types';

interface CandidatesStageProps {
  summary: CandidatesSummary;
}

export default function CandidatesStage({ summary }: CandidatesStageProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat">
          <span className="label block">Pool</span>
          <span className="text-xl font-bold text-hi font-mono">
            {summary.pool.length}
          </span>
        </div>
        <div className="stat">
          <span className="label block">FOR / NFOR</span>
          <span className="text-xl font-bold text-cyan font-mono">
            {summary.for_count} / {summary.nfor_count}
          </span>
        </div>
        <div className="stat">
          <span className="label block">Rescued (sparse)</span>
          <span className="text-xl font-bold text-emerald font-mono">
            {summary.rescued.length}
          </span>
        </div>
        <div className="stat">
          <span className="label block">True in pool</span>
          <span className="text-xl font-bold font-mono text-mid">
            {summary.true_in_pool === null ? '–' : summary.true_in_pool ? 'YES' : 'NO'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-mid mb-1.5 flex items-center gap-1.5">
            <ListFilter className="w-3.5 h-3.5 text-accent3" />
            Dropped windows
          </h4>
          <div className="stat space-y-1 font-mono text-xs">
            {Object.entries(summary.dropped).map(([k, v]) => (
              <div key={k} className="flex justify-between text-mid">
                <span>{k}</span>
                <span className="text-hi font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-mid mb-1.5">
            Excluded bytes (by rule)
          </h4>
          <div className="stat space-y-1 font-mono text-xs max-h-40 overflow-y-auto">
            {Object.entries(summary.excluded).map(([b, rules]) => (
              <div key={b} className="flex justify-between text-mid">
                <span>byte {b}</span>
                <span className="text-red">{rules.join(', ')}</span>
              </div>
            ))}
            {Object.keys(summary.excluded).length === 0 && (
              <span className="text-faint">none</span>
            )}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-mid mb-1.5">
          Candidate pool ({summary.pool.length})
        </h4>
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-panel">
              <tr className="text-low text-left border-b border-default">
                <th className="py-1.5 pr-3">Offset</th>
                <th className="py-1.5 pr-3">Length</th>
                <th className="py-1.5 pr-3">Region</th>
                <th className="py-1.5 pr-3">Kind</th>
                <th className="py-1.5 pr-3">TLV type</th>
                <th className="py-1.5 pr-3">Distinct</th>
                <th className="py-1.5">Direction</th>
              </tr>
            </thead>
            <tbody>
              {summary.pool.map((c, i) => (
                <tr key={i} className="border-b border-default-wash text-hi">
                  <td className="py-1.5 pr-3">{c.offset}</td>
                  <td className="py-1.5 pr-3">{c.length}</td>
                  <td className="py-1.5 pr-3">
                    <span
                      className={
                        c.region === 'FOR'
                          ? 'text-cyan'
                          : 'text-violet'
                      }
                    >
                      {c.region}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3">{c.kind}</td>
                  <td className="py-1.5 pr-3">{c.tlv_type ?? '–'}</td>
                  <td className="py-1.5 pr-3">{c.distinct}</td>
                  <td className="py-1.5">{c.direction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-low">
        S (available bytes):{' '}
        <span className="font-mono text-mid">
          [{summary.S.join(', ')}]
        </span>
      </div>
    </div>
  );
}
