import React from 'react';
import { GitBranch } from 'lucide-react';
import { Stage2Direction } from '../../../types';

interface Stage2PanelProps {
  directions: Record<string, Stage2Direction>;
}

export default function Stage2Panel({ directions }: Stage2PanelProps) {
  const dirs = Object.keys(directions);
  if (dirs.length === 0) {
    return <p className="text-xs text-faint">No stage-2 results (stage skipped).</p>;
  }
  return (
    <div className="space-y-5">
      {dirs.map((d) => {
        const sec = directions[d];
        return (
          <div key={d}>
            <h4 className="text-xs font-semibold text-mid mb-1.5 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-accent3" />
              Direction <span className="font-mono text-cyan">{d}</span>
              {sec.winner && (
                <span className="text-faint font-normal">
                  winner:{' '}
                  <span className="font-mono text-emerald">
                    {sec.winner.offset}/{sec.winner.length}
                  </span>
                </span>
              )}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-low text-left border-b border-default">
                    <th className="py-1.5 pr-3">Rank</th>
                    <th className="py-1.5 pr-3">Keyword</th>
                    <th className="py-1.5 pr-3">Region</th>
                    <th className="py-1.5 pr-3">p_bit</th>
                    <th className="py-1.5 pr-3">p_offset</th>
                    <th className="py-1.5 pr-3">p_f</th>
                    <th className="py-1.5 pr-3">Posterior</th>
                    <th className="py-1.5 pr-3">S1 rank</th>
                    <th className="py-1.5 pr-3">MSB / D</th>
                    <th className="py-1.5">Q(k) vs P(k)</th>
                    <th className="py-1.5 pr-3">Catalog</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.rows.map((r) => (
                    <tr
                      key={`${r.offset}-${r.length}-${r.region}`}
                      className={`border-b border-default-wash text-hi ${
                        r.is_true ? 'bg-amber-wash-5' : ''
                      }`}
                    >
                      <td className="py-1.5 pr-3 font-semibold">{r.rank}</td>
                      <td className="py-1.5 pr-3 text-cyan-soft">
                        {r.offset}/{r.length}
                      </td>
                      <td className="py-1.5 pr-3">{r.region}</td>
                      <td className="py-1.5 pr-3">{r.p_bit.toFixed(3)}</td>
                      <td className="py-1.5 pr-3">{r.p_offset.toFixed(3)}</td>
                      <td className="py-1.5 pr-3">{r.p_f.toFixed(3)}</td>
                      <td className="py-1.5 pr-3 font-semibold text-hi">
                        {r.posterior.toFixed(3)}
                      </td>
                      <td className="py-1.5 pr-3">{r.stage1_rank}</td>
                      <td className="py-1.5 pr-3 text-low">
                        {r.bits.msb} / {r.bits.D.toFixed(3)}
                      </td>
                      <td className="py-1.5">
                        <div className="flex items-end gap-0.5 h-8">
                          {r.bits.q_k.map((q, k) => {
                            const p = r.bits.p_k[k] || 0;
                            return (
                              <span key={k} className="flex items-end gap-0.5">
                                <span
                                  className="w-1 bg-cyan2 rounded-sm"
                                  style={{ height: `${Math.max(2, q * 30)}px` }}
                                  title={`k=${k + 1} Q=${q.toFixed(2)}`}
                                />
                                <span
                                  className="w-1 bg-amber2 rounded-sm"
                                  style={{ height: `${Math.max(2, p * 30)}px` }}
                                  title={`k=${k + 1} P=${p.toFixed(2)}`}
                                />
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-1.5 pr-3">
                        {r.is_true && (
                          <span className="px-1.5 py-0.5 bg-amber-wash-15 text-amber border border-amber-wash-30 rounded text-[9px]">
                            TRUE (catalog, eval only)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
