import React from 'react';
import { Cpu } from 'lucide-react';
import { RankedCandidate } from '../../types';

interface Stage2TabProps {
  topCandidate: RankedCandidate | null;
}

export default function Stage2Tab({ topCandidate }: Stage2TabProps) {
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
