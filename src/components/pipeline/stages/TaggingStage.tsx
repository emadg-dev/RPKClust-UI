import React from 'react';
import { Tags } from 'lucide-react';
import { TaggingSummary } from '../../../types';

interface TaggingStageProps {
  summary: TaggingSummary;
}

const RULE_COLORS: Record<string, string> = {
  constant: 'bg-inset3 text-hi',
  sequence: 'bg-sky-wash text-sky-soft',
  timestamp: 'bg-violet-wash-20 text-violet-soft',
  sparse: 'bg-emerald-wash text-emerald-soft',
  checksum: 'bg-amber-wash text-amber-soft',
  address: 'bg-rose-wash text-rose-soft',
  float: 'bg-cyan-wash text-cyan-soft',
  length: 'bg-orange-wash-20 text-orange-soft',
};

export default function TaggingStage({ summary }: TaggingStageProps) {
  const bytes = Object.keys(summary.by_byte)
    .map(Number)
    .sort((a, b) => a - b);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="stat">
          <span className="label block">
            Total tags
          </span>
          <span className="text-xl font-bold text-hi font-mono">
            {summary.n_hits}
          </span>
        </div>
        <div className="stat">
          <span className="label block">
            Multi-tag bytes
          </span>
          <span className="text-xl font-bold text-amber font-mono">
            {summary.multi_tag_bytes.length}
          </span>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-mid mb-1.5 flex items-center gap-1.5">
          <Tags className="w-3.5 h-3.5 text-accent3" />
          Tags per byte
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-low text-left border-b border-default">
                <th className="py-1.5 pr-4">Byte</th>
                <th className="py-1.5">Rules</th>
              </tr>
            </thead>
            <tbody>
              {bytes.map((b) => (
                <tr key={b} className="border-b border-default-wash">
                  <td className="py-1.5 pr-4 text-hi font-semibold">
                    {b}
                    {summary.multi_tag_bytes.includes(b) && (
                      <span className="ml-1.5 text-[9px] px-1 py-0.5 bg-amber-wash-15 text-amber rounded border border-amber-wash-30">
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
                            RULE_COLORS[r] || 'bg-inset2 text-hi'
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
