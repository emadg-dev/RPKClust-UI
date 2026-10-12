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
        <h4 className="text-xs font-semibold text-mid mb-1.5 flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5 text-accent3" />
          Rule matrix — windows covering byte {selectedByte} ({covering.length})
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-low text-left border-b border-default">
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
                  className="border-b border-default-wash text-hi"
                >
                  <td className="py-1.5 pr-3">
                    <span className="px-1.5 py-0.5 bg-accent2-wash-10 text-accent-soft rounded text-[10px]">
                      {r.rule}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3">
                    {r.offset}/{r.length}
                  </td>
                  <td className="py-1.5 pr-3">
                    {r.fires ? (
                      <span className="text-emerald font-semibold">yes</span>
                    ) : (
                      <span className="text-faint">no</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    {r.msg_ok === null ? (
                      <span className="text-faint">n/a</span>
                    ) : r.msg_ok ? (
                      <span className="text-emerald">true</span>
                    ) : (
                      <span className="text-red">false</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    {r.blocking === null ? (
                      <span className="text-faint">n/a</span>
                    ) : r.blocking ? (
                      <span className="text-amber font-semibold">true</span>
                    ) : (
                      <span className="text-faint">false</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-10 h-1.5 bg-inset rounded overflow-hidden inline-block">
                        <span
                          className="block h-full bg-cyan"
                          style={{ width: `${Math.round(r.fraction_ok * 100)}%` }}
                        />
                      </span>
                      {r.fraction_ok.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-1.5 text-low">{r.detail}</td>
                </tr>
              ))}
              {covering.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-2 text-faint">
                    No rule windows cover this byte.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-mid mb-1.5 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-accent3" />
          Value histogram at byte {selectedByte} (top 12 across dataset)
        </h4>
        {histogram && histogram.length > 0 ? (
          <div className="stat">
            <div className="flex items-end gap-1 h-24">
              {histogram.map(([val, cnt]) => (
                <div
                  key={val}
                  className="flex flex-col items-center gap-0.5 shrink-0"
                  title={`0x${val}: ${cnt} msgs`}
                >
                  <span className="text-[9px] font-mono text-low">{cnt}</span>
                  <div
                    className="w-6 bg-cyan-wash-80 rounded-sm"
                    style={{ height: `${Math.max(2, (cnt / maxCount) * 64)}px` }}
                  />
                  <span className="text-[9px] font-mono text-faint">
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-faint">No histogram for this byte.</p>
        )}
      </div>
    </div>
  );
}
