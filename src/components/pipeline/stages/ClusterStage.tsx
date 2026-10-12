import React from 'react';
import { Boxes } from 'lucide-react';
import { ClusterDirection } from '../../../types';

interface ClusterStageProps {
  directions: Record<string, ClusterDirection>;
}

export default function ClusterStage({ directions }: ClusterStageProps) {
  const dirs = Object.keys(directions);
  if (dirs.length === 0) {
    return <p className="text-xs text-slate-500">No clustering results (stage skipped).</p>;
  }
  return (
    <div className="space-y-5">
      {dirs.map((d) => {
        const sec = directions[d];
        return (
          <div key={d}>
            <h4 className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-indigo-400" />
              Direction <span className="font-mono text-cyan-400">{d}</span>
              <span className="text-slate-500 font-normal">
                keyword:{' '}
                <span className="font-mono text-emerald-400">
                  {sec.keyword ? `${sec.keyword.offset}/${sec.keyword.length}` : '–'}
                </span>
              </span>
              <span className="text-slate-500 font-normal">
                none={sec.none} unclassified={sec.unclassified}
              </span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-slate-400 text-left border-b border-slate-800">
                    <th className="py-1.5 pr-4">Cluster key</th>
                    <th className="py-1.5 pr-4">Size</th>
                    <th className="py-1.5">Example message ids</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.clusters.map((c) => (
                    <tr key={c.key} className="border-b border-slate-800/50 text-slate-200">
                      <td className="py-1.5 pr-4 text-cyan-300">{c.key}</td>
                      <td className="py-1.5 pr-4 font-semibold">{c.size}</td>
                      <td className="py-1.5 text-slate-400">
                        [{c.examples.slice(0, 12).join(', ')}
                        {c.examples.length > 12 ? ', …' : ''}]
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
