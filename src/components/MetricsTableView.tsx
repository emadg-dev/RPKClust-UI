import React from 'react';
import { RefreshCw } from 'lucide-react';
import { BenchmarkResult } from '../types';

export interface MetricsTableViewProps {
  benchmarks: BenchmarkResult[];
  benchLoading: boolean;
  onReEvaluate: () => void;
}

/**
 * Table view that renders protocol inference results — boundary-inferred
 * keywords, clustering metrics (h/c/v), and boundary B per protocol trace.
 */
export default function MetricsTableView({ benchmarks, benchLoading, onReEvaluate }: MetricsTableViewProps) {
  return (
    <div className="panel overflow-hidden">
      <div className="px-6 py-4 border-b border-default flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-hi text-base flex items-center gap-2">
            Protocol Inference Results
          </h3>
          <p className="text-xs text-low mt-0.5">
            Boundary-inferred keywords, clustering metrics (h/c/v), and inferred B per protocol trace.
          </p>
        </div>
        <button
          onClick={onReEvaluate}
          disabled={benchLoading}
          className="px-3 py-1.5 btn-primary disabled:opacity-50 text-hi text-xs font-semibold rounded flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${benchLoading ? 'animate-spin' : ''}`} />
          Re-evaluate
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-mid min-w-[900px]">
          <thead className="bg-inset text-xs uppercase text-low font-semibold border-b border-default font-mono">
            <tr>
              {['Source / Protocol', 'True Keyword', 'Inferred Keyword', 'Keyword Error', 'Boundary B', 'Homogeneity h', 'Completeness c', 'V-Measure v', 'Time (s)'].map((label, i) => (
                <th
                  key={i}
                  className="px-3 py-3 "
                  style={{ minWidth: 120, maxWidth: 240 }}
                >
                  <div className="flex items-center gap-1">
                    <span>{label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tbody font-mono text-xs">
            {benchmarks.map((b) => {
              const c2sKw = b.inferred_keywords?.['c2s'] ?? b.inferred_keywords?.['both'];
              const inferredStr = c2sKw ? `Offset ${c2sKw.offset} (Len ${c2sKw.length})` : '-';
              const trueStr = b.true_keyword?.offset !== undefined ? `${b.true_keyword.name || 'Opcode'} (Off ${b.true_keyword.offset}, Len ${b.true_keyword.length || 1})` : '-';
              const trueOff = b.true_keyword?.offset;
              const trueLen = b.true_keyword?.length ?? 1;
              let kwErr: { text: string; cls: string } | null = null;
              if (trueOff !== undefined && c2sKw) {
                const offErr = c2sKw.offset - trueOff;
                const lenErr = c2sKw.length - trueLen;
                if (offErr === 0 && lenErr === 0) {
                  kwErr = { text: '0 bytes (Exact)', cls: 'bg-emerald-wash text-emerald-soft border border-emerald-wash-30' };
                } else if (offErr === 0) {
                  kwErr = { text: `0 bytes (len Δ${lenErr > 0 ? '+' : ''}${lenErr})`, cls: 'bg-amber-wash text-amber-soft border border-amber-wash-30' };
                } else {
                  const lenSuffix = lenErr !== 0 ? ` · len Δ${lenErr > 0 ? '+' : ''}${lenErr}` : '';
                  kwErr = { text: `${Math.abs(offErr)} bytes${lenSuffix}`, cls: 'bg-rose-wash text-rose-soft border border-rose-wash-30' };
                }
              }
              return (
                <tr key={`${b.source_id}-${b.dataset_id || b.protocol}`} className="hover-bg-inset transition">
                  <td className="px-3 py-3 font-bold text-hi">
                    <div><span className="uppercase">{b.dataset_name || b.protocol}</span><span className="block text-[10px] text-low font-normal lowercase">{b.source_name || b.source_id}</span></div>
                  </td>
                  <td className="px-3 py-3 text-mid font-semibold">{trueStr}</td>
                  <td className="px-3 py-3 font-bold text-cyan">{inferredStr}</td>
                  <td className="px-3 py-3">{kwErr ? <span className={`badge font-bold ${kwErr.cls}`}>{kwErr.text}</span> : <span className="text-low">–</span>}</td>
                  <td className="px-3 py-3 font-bold text-amber">{b.boundary_B ?? b.min_len ?? '-'} bytes</td>
                  <td className="px-3 py-3 font-semibold text-emerald">{(b.homogeneity * 100).toFixed(1)}%</td>
                  <td className="px-3 py-3 font-semibold text-amber">{(b.completeness * 100).toFixed(1)}%</td>
                  <td className="px-3 py-3"><span className="badge font-bold bg-accent2-wash text-accent-soft border border-accent2-wash-30">{(b.v_measure * 100).toFixed(1)}%</span></td>
                  <td className="px-3 py-3 text-low">{b.timing_sec.toFixed(2)}s</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
