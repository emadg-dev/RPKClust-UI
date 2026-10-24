import React from 'react';
import { Sparkles, Cpu, GitBranch } from 'lucide-react';
import { RankedCandidate, Stage2Direction, TrueKeyword } from '../types';

// ---------------------------------------------------------------------------
// Reusable bit-usage mini chart (Q(k) empirical vs P(k) theoretical)
// Used by detailed mode and CandidatePathTable expanded rows
// ---------------------------------------------------------------------------

interface BitUsageChartProps {
  q_k: number[];
  p_k: number[];
  maxHeight?: number;
  className?: string;
  barClassName?: string;
}

export function BitUsageChart({
  q_k,
  p_k,
  maxHeight = 30,
  className = 'flex items-end gap-0.5 h-8',
  barClassName = 'w-1',
}: BitUsageChartProps) {
  return (
    <div className={className}>
      {q_k.map((q, k) => {
        const p = p_k[k] || 0;
        return (
          <span key={k} className="flex items-end gap-0.5">
            <span
              className={`${barClassName} bg-cyan2 rounded-sm`}
              style={{ height: `${Math.max(2, q * maxHeight)}px` }}
              title={`k=${k + 1} Q=${q.toFixed(2)}`}
            />
            <span
              className={`${barClassName} bg-amber2 rounded-sm`}
              style={{ height: `${Math.max(2, p * maxHeight)}px` }}
              title={`k=${k + 1} P=${p.toFixed(2)}`}
            />
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table mode — replaces CandidateRankingTable (InspectorTab)
// ---------------------------------------------------------------------------

interface TableModeProps {
  ranking: RankedCandidate[];
}

function TableMode({ ranking }: TableModeProps) {
  const candidates = ranking ?? [];

  return (
    <div className="panel p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-hi text-base flex items-center gap-2">
           
            Factor Graph Candidate Rankings (Stage 1 &amp; Stage 2 Multi-Constraint Probabilities)
          </h3>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono text-mid">
          <thead className="thead">
            <tr>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Offset</th>
              <th className="px-4 py-3">Length</th>
              <th className="px-4 py-3">Stage 1 P(K=1)</th>
              <th className="px-4 py-3">Bit-Use P_bit</th>
              <th className="px-4 py-3">Position P_pos</th>
              <th className="px-4 py-3">Final Bayesian Posterior</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="tbody">
            {candidates.map((r, i) => {
              const isTop = i === 0;
              return (
                <tr
                  key={i}
                  className={`hover-bg-inset transition ${
                    isTop ? 'bg-accent-dark-wash font-bold' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`badge text-[10px] font-bold ${
                        r.region === 'FOR'
                          ? 'bg-amber-wash text-amber-soft border border-amber-wash-30'
                          : 'bg-orange-wash-20 text-orange-soft border border-orange-wash-30'
                      }`}
                    >
                      {r.region}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-cyan-soft">{r.offset}</td>
                  <td className="px-4 py-3">{r.length} bytes</td>
                  <td className="px-4 py-3 text-mid">{(r.p_f * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-emerald">{(r.p_bit * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-accent-soft">{(r.p_offset * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-amber-soft">
                      {(r.posterior * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isTop ? (
                      <span className="badge font-bold bg-cyan-wash text-cyan-soft border border-cyan-wash-30">
                        Inferred Keyword
                      </span>
                    ) : (
                      <span className="text-faint">Rank #{i + 1}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detailed mode — replaces Stage2Panel (PipelineTab → StageDetail)
// ---------------------------------------------------------------------------

interface DetailedModeProps {
  directions: Record<string, Stage2Direction>;
}

function DetailedMode({ directions }: DetailedModeProps) {
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
                        <BitUsageChart q_k={r.bits.q_k} p_k={r.bits.p_k} maxHeight={30} />
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

// ---------------------------------------------------------------------------
// Chart mode — replaces Stage2Tab
// ---------------------------------------------------------------------------

interface ChartModeProps {
  topCandidate: RankedCandidate | null;
}

function ChartMode({ topCandidate }: ChartModeProps) {
  return (
    <div className="space-y-6">
      <div className="panel p-6 space-y-4">
        <h3 className="font-bold text-hi text-base flex items-center gap-2">
          <Cpu className="w-5 h-5 text-accent3" />
          Stage 2 Self-Constraint: Bit-Usage Euclidean Distance Analysis
        </h3>
        <p className="text-xs text-low">
          Visualizing empirical bit-position activation $Q(k)$ against theoretical geometric distribution $P(k)$ for top keyword candidate at offset {topCandidate?.offset ?? 0}.
        </p>

        {topCandidate?.q_k && topCandidate.q_k.length > 0 ? (
          <div className="bg-base p-6 rounded border border-default space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 bg-panel rounded border border-default">
                <span className="text-low block">MSB Position (m):</span>
                <span className="text-lg font-bold text-cyan">{topCandidate.msb}</span>
              </div>
              <div className="p-3 bg-panel rounded border border-default">
                <span className="text-low block">Euclidean Distance D:</span>
                <span className="text-lg font-bold text-amber">{topCandidate.D?.toFixed(4)}</span>
              </div>
              <div className="p-3 bg-panel rounded border border-default">
                <span className="text-low block">Bit-Use Probability P_bit:</span>
                <span className="text-lg font-bold text-emerald">
                  {((topCandidate.p_bit || 0) * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="pt-4">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-low font-mono">Bit Position k (0..{topCandidate.q_k.length - 1}):</span>
                <div className="flex items-center gap-4 font-mono">
                  <span className="flex items-center gap-1.5 text-cyan">
                    <span className="w-3 h-3 rounded bg-cyan2" />
                    <span>Empirical Q(k)</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-amber">
                    <span className="w-3 h-3 rounded bg-amber2" />
                    <span>Theoretical P(k)</span>
                  </span>
                </div>
              </div>

              <svg viewBox="0 0 800 200" className="w-full h-52">
                {[0, 0.25, 0.5, 0.75, 1.0].map((val) => {
                  const y = 170 - val * 140;
                  return (
                    <g key={val}>
                      <line x1="40" y1={y} x2="780" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                      <text x="35" y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                        {val.toFixed(2)}
                      </text>
                    </g>
                  );
                })}

                {topCandidate.q_k.map((qVal, kIdx) => {
                  const pVal = topCandidate.p_k?.[kIdx] || 0;
                  const x = 60 + kIdx * (700 / topCandidate.q_k!.length);
                  const qHeight = Math.max(2, qVal * 140);
                  const pHeight = Math.max(2, pVal * 140);

                  return (
                    <g key={kIdx}>
                      <rect x={x} y={170 - qHeight} width="16" height={qHeight} fill="#06b6d4" rx="2" />
                      <rect x={x + 18} y={170 - pHeight} width="16" height={pHeight} fill="#f59e0b" rx="2" />
                      <text x={x + 17} y="188" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">
                        k={kIdx + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        ) : (
          <div className="bg-base p-8 rounded border border-default text-center text-faint text-xs font-mono">
            No bit-use evaluation data available for the selected candidate.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CandidateRankingViewProps {
  mode: 'table' | 'detailed' | 'chart';

  candidates?: RankedCandidate[];
  directions?: Record<string, Stage2Direction>;
  topCandidate?: RankedCandidate | null;
  trueKeyword?: TrueKeyword | null;
}

export default function CandidateRankingView(props: CandidateRankingViewProps) {
  switch (props.mode) {
    case 'table':
      return <TableMode ranking={props.candidates ?? []} />;
    case 'detailed':
      return <DetailedMode directions={props.directions ?? {}} />;
    case 'chart':
      return <ChartMode topCandidate={props.topCandidate ?? null} />;
  }
}