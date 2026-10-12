import React from 'react';
import { LayoutGrid, BarChart3 } from 'lucide-react';
import { RuleEval } from '../../types';

interface ByteInspectorProps {
  rules: RuleEval[];
  selectedByte: number;
  histogram: Array<[string, number]> | undefined;
}

export default function ByteInspector({
  rules,
  selectedByte,
  histogram,
}: ByteInspectorProps) {
  const covering = rules
    .filter(
      (r) => r.offset <= selectedByte && selectedByte < r.offset + r.length,
    )
    .sort((a, b) => a.offset - b.offset || a.length - b.length);

  const maxCount = histogram ? Math.max(...histogram.map(([, c]) => c), 1) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
          Rule matrix — windows covering byte {selectedByte} ({covering.length})
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-slate-400 text-left border-b border-slate-800">
                <th className="py-1.5 pr-3">Rule</th>
                <th className="py-1.5 pr-3">Window</th>
                <th className="py-1.5 pr-3">Fires</th>
                <th className="py-1.5 pr-3">msg_ok</th>
                <th className="py-1.5 pr-3">blocking</th>
                <th className="py-1.5 pr-3">fraction_ok</th>
                <th className="py-1.5">Detail</th>
              </tr>
            </thead>
            <tbody>
              {covering.map((r, i) => (
                <tr
                  key={`${r.rule}-${r.offset}-${r.length}-${i}`}
                  className="border-b border-slate-800/50 text-slate-200"
                >
                  <td className="py-1.5 pr-3">
                    <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 rounded text-[10px]">
                      {r.rule}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3">
                    {r.offset}/{r.length}
                  </td>
                  <td className="py-1.5 pr-3">
                    {r.fires ? (
                      <span className="text-emerald-400 font-semibold">yes</span>
                    ) : (
                      <span className="text-slate-500">no</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    {r.msg_ok === null ? (
                      <span className="text-slate-500">n/a</span>
                    ) : r.msg_ok ? (
                      <span className="text-emerald-400">true</span>
                    ) : (
                      <span className="text-red-400">false</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    {r.blocking === null ? (
                      <span className="text-slate-500">n/a</span>
                    ) : r.blocking ? (
                      <span className="text-amber-400 font-semibold">true</span>
                    ) : (
                      <span className="text-slate-500">false</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-10 h-1.5 bg-slate-800 rounded overflow-hidden inline-block">
                        <span
                          className="block h-full bg-cyan-400"
                          style={{ width: `${Math.round(r.fraction_ok * 100)}%` }}
                        />
                      </span>
                      {r.fraction_ok.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-1.5 text-slate-400">{r.detail}</td>
                </tr>
              ))}
              {covering.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-2 text-slate-500">
                    No rule windows cover this byte.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
          Value histogram at byte {selectedByte} (top 12 across dataset)
        </h4>
        {histogram && histogram.length > 0 ? (
          <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
            <div className="flex items-end gap-1 h-24">
              {histogram.map(([val, cnt]) => (
                <div
                  key={val}
                  className="flex flex-col items-center gap-0.5 shrink-0"
                  title={`0x${val}: ${cnt} msgs`}
                >
                  <span className="text-[9px] font-mono text-slate-400">{cnt}</span>
                  <div
                    className="w-6 bg-cyan-500/80 rounded-sm"
                    style={{ height: `${Math.max(2, (cnt / maxCount) * 64)}px` }}
                  />
                  <span className="text-[9px] font-mono text-slate-500">
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No histogram for this byte.</p>
        )}
      </div>
    </div>
  );
}
