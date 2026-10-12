import React from 'react';
import { Boxes } from 'lucide-react';
import { ClusterDirection } from '../../../types';

interface ClusterStageProps {
  directions: Record<string, ClusterDirection>;
}

export default function ClusterStage({ directions }: ClusterStageProps) {
  const dirs = Object.keys(directions);
  if (dirs.length === 0) {
    return <p className="text-xs text-faint">No clustering results (stage skipped).</p>;
  }
  return (
    <div className="space-y-5">
      {dirs.map((d) => {
        const sec = directions[d];
        return (
          <div key={d}>
            <h4 className="text-xs font-semibold text-mid mb-1.5 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-accent3" />
              Direction <span className="font-mono text-cyan">{d}</span>
              <span className="text-faint font-normal">
                keyword:{' '}
                <span className="font-mono text-emerald">
                  {sec.keyword ? `${sec.keyword.offset}/${sec.keyword.length}` : '–'}
                </span>
              </span>
              <span className="text-faint font-normal">
                none={sec.none} unclassified={sec.unclassified}
              </span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-low text-left border-b border-default">
                    <th className="py-1.5 pr-4">Cluster key</th>
                    <th className="py-1.5 pr-4">Size</th>
                    <th className="py-1.5">Example message ids</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.clusters.map((c) => (
                    <tr key={c.key} className="border-b border-default-wash text-hi">
                      <td className="py-1.5 pr-4 text-cyan-soft">{c.key}</td>
                      <td className="py-1.5 pr-4 font-semibold">{c.size}</td>
                      <td className="py-1.5 text-low">
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
