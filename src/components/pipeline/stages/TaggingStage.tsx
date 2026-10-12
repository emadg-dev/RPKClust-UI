import React from 'react';
import { Tags } from 'lucide-react';
import { TaggingSummary } from '../../../types';

interface TaggingStageProps {
  summary: TaggingSummary;
}

const RULE_COLORS: Record<string, string> = {
  constant: 'bg-slate-600 text-slate-100',
  sequence: 'bg-sky-500/20 text-sky-300',
  timestamp: 'bg-violet-500/20 text-violet-300',
  sparse: 'bg-emerald-500/20 text-emerald-300',
  checksum: 'bg-amber-500/20 text-amber-300',
  address: 'bg-rose-500/20 text-rose-300',
  float: 'bg-cyan-500/20 text-cyan-300',
  length: 'bg-orange-500/20 text-orange-300',
};

export default function TaggingStage({ summary }: TaggingStageProps) {
  const bytes = Object.keys(summary.by_byte)
    .map(Number)
    .sort((a, b) => a - b);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
            Total tags
          </span>
          <span className="text-xl font-bold text-white font-mono">
            {summary.n_hits}
          </span>
        </div>
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
            Multi-tag bytes
          </span>
          <span className="text-xl font-bold text-amber-400 font-mono">
            {summary.multi_tag_bytes.length}
          </span>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
          <Tags className="w-3.5 h-3.5 text-indigo-400" />
          Tags per byte
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-slate-400 text-left border-b border-slate-800">
                <th className="py-1.5 pr-4">Byte</th>
                <th className="py-1.5">Rules</th>
              </tr>
            </thead>
            <tbody>
              {bytes.map((b) => (
                <tr key={b} className="border-b border-slate-800/50">
                  <td className="py-1.5 pr-4 text-slate-200 font-semibold">
                    {b}
                    {summary.multi_tag_bytes.includes(b) && (
                      <span className="ml-1.5 text-[9px] px-1 py-0.5 bg-amber-500/15 text-amber-400 rounded border border-amber-500/30">
                        multi
                      </span>
                    )}
                  </td>
                  <td className="py-1.5">
                    <div className="flex flex-wrap gap-1">
                      {summary.by_byte[String(b)].map((r) => (
                        <span
                          key={r}
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            RULE_COLORS[r] || 'bg-slate-700 text-slate-200'
                          }`}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
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
