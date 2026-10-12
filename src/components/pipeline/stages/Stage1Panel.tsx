import React from 'react';
import { Sigma } from 'lucide-react';
import { Stage1Direction } from '../../../types';

interface Stage1PanelProps {
  directions: Record<string, Stage1Direction>;
}

function ProbCell({ v }: { v: number }) {
  const pct = Math.round(v * 100);
  return (
    <span className="inline-flex items-center gap-1 font-mono">
      <span className="w-10 h-1.5 bg-inset rounded overflow-hidden inline-block">
        <span
          className="block h-full bg-accent3"
          style={{ width: `${pct}%` }}
        />
      </span>
      {v.toFixed(3)}
    </span>
  );
}

export default function Stage1Panel({ directions }: Stage1PanelProps) {
  const dirs = Object.keys(directions);
  if (dirs.length === 0) {
    return <p className="text-xs text-faint">No stage-1 results (stage skipped).</p>;
  }
  return (
    <div className="space-y-5">
      {dirs.map((d) => {
        const sec = directions[d];
        return (
          <div key={d}>
            <h4 className="text-xs font-semibold text-mid mb-1.5 flex items-center gap-1.5">
              <Sigma className="w-3.5 h-3.5 text-accent3" />
              Direction <span className="font-mono text-cyan">{d}</span>
              <span className="text-faint font-normal">
                (top-{sec.top_k})
              </span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-low text-left border-b border-default">
                    <th className="py-1.5 pr-3">Rank</th>
                    <th className="py-1.5 pr-3">Keyword</th>
                    <th className="py-1.5 pr-3">Region</th>
                    <th className="py-1.5 pr-3">Clusters</th>
                    <th className="py-1.5 pr-3">Distinct</th>
                    <th className="py-1.5 pr-3">Singletons</th>
                    <th className="py-1.5 pr-3">p_m (raw)</th>
                    <th className="py-1.5 pr-3">p_r (raw)</th>
                    <th className="py-1.5 pr-3">p_s (raw)</th>
                    <th className="py-1.5 pr-3">p_m</th>
                    <th className="py-1.5 pr-3">p_r</th>
                    <th className="py-1.5 pr-3">p_s</th>
                    <th className="py-1.5 pr-3">p_d</th>
                    <th className="py-1.5 pr-3">p_f</th>
                    <th className="py-1.5">Catalog</th>
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
                        <span className="text-faint"> ({r.kind})</span>
                      </td>
                      <td className="py-1.5 pr-3">{r.region}</td>
                      <td className="py-1.5 pr-3">{r.n_clusters}</td>
                      <td className="py-1.5 pr-3">{r.n_distinct}</td>
                      <td className="py-1.5 pr-3">{r.singletons}</td>
                      <td className="py-1.5 pr-3 text-low">{r.raw.p_m.toFixed(3)}</td>
                      <td className="py-1.5 pr-3 text-low">{r.raw.p_r.toFixed(3)}</td>
                      <td className="py-1.5 pr-3 text-low">{r.raw.p_s.toFixed(3)}</td>
                      <td className="py-1.5 pr-3"><ProbCell v={r.p_m} /></td>
                      <td className="py-1.5 pr-3"><ProbCell v={r.p_r} /></td>
                      <td className="py-1.5 pr-3"><ProbCell v={r.p_s} /></td>
                      <td className="py-1.5 pr-3">{r.p_d.toFixed(2)}</td>
                      <td className="py-1.5 pr-3 font-semibold text-hi">{r.p_f.toFixed(3)}</td>
                      <td className="py-1.5">
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
