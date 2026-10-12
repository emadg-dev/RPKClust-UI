import React from 'react';
import { Sparkles } from 'lucide-react';
import { RankedCandidate } from '../types';

interface CandidateRankingTableProps {
  ranking: RankedCandidate[] | undefined;
}

export default function CandidateRankingTable({ ranking }: CandidateRankingTableProps) {
  const candidates = ranking ?? [];

  return (
    <div className="panel p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-hi text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan" />
            Factor Graph Candidate Rankings (Stage 1 &amp; Stage 2 Multi-Constraint Probabilities)
          </h3>
          <p className="text-xs text-low mt-0.5">
            Step-by-step posterior probabilities across Message Similarity, Remote Coupling, Structural Coherence, Dimension, Bit-Use, and Position constraints.
          </p>
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
