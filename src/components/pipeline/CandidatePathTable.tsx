import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Trophy, BookMarked } from 'lucide-react';
import { CandidatePath } from '../../types';

interface CandidatePathTableProps {
  path: CandidatePath[];
}

function Prob({ v }: { v: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono">
      <span className="w-8 h-1.5 bg-inset rounded overflow-hidden inline-block">
        <span
          className="block h-full bg-accent3"
          style={{ width: `${Math.round(v * 100)}%` }}
        />
      </span>
      {v.toFixed(2)}
    </span>
  );
}

export default function CandidatePathTable({ path }: CandidatePathTableProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-low text-left border-b border-default">
            <th className="py-1.5 pr-2 w-6" />
            <th className="py-1.5 pr-3">Id</th>
            <th className="py-1.5 pr-3">Keyword</th>
            <th className="py-1.5 pr-3">Region</th>
            <th className="py-1.5 pr-3">Kind</th>
            <th className="py-1.5 pr-3">Value</th>
            <th className="py-1.5 pr-3">Cluster</th>
            <th className="py-1.5 pr-3">Size</th>
            <th className="py-1.5 pr-3">K</th>
            <th className="py-1.5 pr-3">p_m</th>
            <th className="py-1.5 pr-3">p_r</th>
            <th className="py-1.5 pr-3">p_s</th>
            <th className="py-1.5 pr-3">p_d</th>
            <th className="py-1.5 pr-3">p_f</th>
            <th className="py-1.5 pr-3">S1 rank</th>
            <th className="py-1.5 pr-3">Posterior</th>
            <th className="py-1.5 pr-3">S2 rank</th>
            <th className="py-1.5">Flags</th>
          </tr>
        </thead>
        <tbody>
          {path.map((c) => {
            const open = expanded === c.candidate_id;
            return (
              <React.Fragment key={c.candidate_id}>
                <tr
                  className={`border-b border-default-wash text-hi ${
                    c.is_winner ? 'bg-emerald-wash-5' : ''
                  } ${c.is_true ? 'bg-amber-wash-5' : ''}`}
                >
                  <td className="py-1.5 pr-2">
                    <button
                      onClick={() =>
                        setExpanded(open ? null : c.candidate_id)
                      }
                      className="text-low hover:text-hi"
                      title={open ? 'Collapse details' : 'Expand details'}
                    >
                      {open ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>
                  <td className="py-1.5 pr-3 font-semibold">{c.candidate_id}</td>
                  <td className="py-1.5 pr-3 text-cyan-soft">
                    {c.offset}/{c.length}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className={c.region === 'FOR' ? 'text-cyan' : 'text-violet'}>
                      {c.region}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3">{c.kind}</td>
                  <td className="py-1.5 pr-3">{c.value ?? '–'}</td>
                  <td className="py-1.5 pr-3 text-low">{c.cluster_key ?? '–'}</td>
                  <td className="py-1.5 pr-3">{c.cluster_size}</td>
                  <td className="py-1.5 pr-3">{c.n_clusters}</td>
                  <td className="py-1.5 pr-3"><Prob v={c.stage1.p_m} /></td>
                  <td className="py-1.5 pr-3"><Prob v={c.stage1.p_r} /></td>
                  <td className="py-1.5 pr-3"><Prob v={c.stage1.p_s} /></td>
                  <td className="py-1.5 pr-3">{c.stage1.p_d.toFixed(2)}</td>
                  <td className="py-1.5 pr-3 font-semibold text-hi">
                    {c.stage1.p_f.toFixed(2)}
                  </td>
                  <td className="py-1.5 pr-3">{c.stage1.rank}</td>
                  <td className="py-1.5 pr-3">
                    {c.stage2 ? (
                      <span className="text-emerald-soft">
                        {c.stage2.posterior.toFixed(3)}
                      </span>
                    ) : (
                      <span className="text-faint">–</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    {c.stage2 ? c.stage2.rank : '–'}
                  </td>
                  <td className="py-1.5">
                    <div className="flex gap-1">
                      {c.is_winner && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-wash-15 text-emerald border border-emerald-wash-30 rounded text-[9px]">
                          <Trophy className="w-2.5 h-2.5" />
                          WINNER
                        </span>
                      )}
                      {c.is_true && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-wash-15 text-amber border border-amber-wash-30 rounded text-[9px]">
                          <BookMarked className="w-2.5 h-2.5" />
                          TRUE (catalog, eval only)
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
                {open && (
                  <tr className="border-b border-default-wash bg-base">
                    <td colSpan={18} className="py-3 px-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-[11px]">
                        <div className="bg-panel rounded border border-default p-2.5">
                          <div className="label font-semibold mb-1">
                            Similarity
                          </div>
                          <div className="space-y-0.5 text-mid">
                            <div>inner mean: {c.similarity.inner_mean.toFixed(3)} (n={c.similarity.n_inner})</div>
                            <div>inter mean: {c.similarity.inter_mean.toFixed(3)} (n={c.similarity.n_inter})</div>
                            <div className="text-faint font-mono text-[10px]">{c.similarity.formula}</div>
                          </div>
                        </div>
                        <div className="bg-panel rounded border border-default p-2.5">
                          <div className="label font-semibold mb-1">
                            Coupling
                          </div>
                          <div className="space-y-0.5 text-mid">
                            <div>
                              partner: {c.coupling.partner_id ?? '–'}
                              {c.coupling.partner_direction ? ` (${c.coupling.partner_direction})` : ''}
                            </div>
                            <div>partner value: {c.coupling.partner_value ?? '–'}</div>
                            <div>cluster p_r: {c.coupling.cluster_pr.toFixed(3)}</div>
                            <div className="text-faint font-mono text-[10px]">{c.coupling.formula}</div>
                          </div>
                        </div>
                        <div className="bg-panel rounded border border-default p-2.5">
                          <div className="label font-semibold mb-1">
                            Structure
                          </div>
                          <div className="space-y-0.5 text-mid">
                            <div>length: {c.structure.length} (cluster median {c.structure.cluster_median})</div>
                            <div>deviation: {c.structure.deviation.toFixed(3)}</div>
                            <div>cluster p_s: {c.structure.cluster_ps.toFixed(3)}</div>
                            <div className="text-faint font-mono text-[10px]">{c.structure.formula}</div>
                          </div>
                        </div>
                        <div className="bg-panel rounded border border-default p-2.5">
                          <div className="label font-semibold mb-1">
                            Dimension
                          </div>
                          <div className="space-y-0.5 text-mid">
                            <div>r_distinct: {c.dimension.r_distinct.toFixed(3)}</div>
                            <div>r_single: {c.dimension.r_single.toFixed(3)}</div>
                            <div>p_d: {c.dimension.p_d.toFixed(2)}</div>
                          </div>
                        </div>
                        {c.stage2 && (
                          <div className="bg-panel rounded border border-default p-2.5 md:col-span-2 xl:col-span-4">
                            <div className="label font-semibold mb-1">
                              Stage 2 bit usage (Q(k) empirical vs P(k) theoretical)
                            </div>
                            <div className="flex items-end gap-0.5 h-16">
                              {c.stage2.q_k.map((q, k) => {
                                const p = c.stage2!.p_k[k] || 0;
                                return (
                                  <span key={k} className="flex items-end gap-0.5">
                                    <span
                                      className="w-1.5 bg-cyan2 rounded-sm"
                                      style={{ height: `${Math.max(2, q * 56)}px` }}
                                      title={`k=${k + 1} Q=${q.toFixed(2)}`}
                                    />
                                    <span
                                      className="w-1.5 bg-amber2 rounded-sm"
                                      style={{ height: `${Math.max(2, p * 56)}px` }}
                                      title={`k=${k + 1} P=${p.toFixed(2)}`}
                                    />
                                  </span>
                                );
                              })}
                            </div>
                            <div className="text-low mt-1">
                              int_value={c.stage2.int_value} · msb={c.stage2.msb} ·
                              p_bit={c.stage2.p_bit.toFixed(3)} · p_offset={c.stage2.p_offset.toFixed(3)} ·
                              in_top_k={c.stage2.in_top_k ? 'yes' : 'no'}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {path.length === 0 && (
            <tr>
              <td colSpan={18} className="py-3 text-faint">
                No candidates in the pool for this message.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
