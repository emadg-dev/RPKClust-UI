import React from 'react';
import { Sparkles } from 'lucide-react';
import { RankedCandidate } from '../types';

interface CandidateRankingTableProps {
  ranking: RankedCandidate[] | undefined;
}

export default function CandidateRankingTable({ ranking }: CandidateRankingTableProps) {
  const candidates = ranking ?? [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Factor Graph Candidate Rankings (Stage 1 &amp; Stage 2 Multi-Constraint Probabilities)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Step-by-step posterior probabilities across Message Similarity, Remote Coupling, Structural Coherence, Dimension, Bit-Use, and Position constraints.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono text-slate-300">
          <thead className="bg-slate-800/60 uppercase text-slate-400 font-semibold border-b border-slate-800">
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
          <tbody className="divide-y divide-slate-800/60">
            {candidates.map((r, i) => {
              const isTop = i === 0;
              return (
                <tr
                  key={i}
                  className={`hover:bg-slate-800/40 transition ${
                    isTop ? 'bg-indigo-950/40 font-bold' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.region === 'FOR'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      }`}
                    >
                      {r.region}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-cyan-300">{r.offset}</td>
                  <td className="px-4 py-3">{r.length} bytes</td>
                  <td className="px-4 py-3 text-slate-300">{(r.p_f * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-emerald-400">{(r.p_bit * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-indigo-300">{(r.p_offset * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-amber-300">
                      {(r.posterior * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isTop ? (
                      <span className="px-2 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Inferred Keyword
                      </span>
                    ) : (
                      <span className="text-slate-500">Rank #{i + 1}</span>
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
