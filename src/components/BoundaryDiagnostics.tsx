import React from 'react';
import { Shield, Zap } from 'lucide-react';
import { Hit, RankedCandidate } from '../types';

interface BoundaryDiagnosticsProps {
  boundaryB: number;
  minLen: number | null;
  candidateCount: number | null;
  hits: Hit[];
}

export function BoundaryDiagnostics({ boundaryB, minLen, candidateCount, hits }: BoundaryDiagnosticsProps) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          Boundary Detection Diagnostics
        </h3>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Inferred Boundary B:</span>
            <span className="font-bold text-amber-400">{boundaryB} bytes</span>
          </div>
          <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Minimum Packet Len:</span>
            <span className="font-bold text-slate-200">
              {minLen ?? 0} bytes
            </span>
          </div>
          <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Generated Candidates:</span>
            <span className="font-bold text-cyan-400">
              {candidateCount ?? 0} fields
            </span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-400" />
          Semantic Exclusion Hits ({hits.length})
        </h3>

        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
          {hits.map((hit, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-indigo-400 uppercase">{hit.rule}</span>
                <span className="text-slate-400 ml-2">
                  Offset {hit.offset} (Len {hit.length})
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                Excluded
              </span>
            </div>
          ))}
          {hits.length === 0 && (
            <div className="text-slate-500 text-center py-4">No detector exclusions fired</div>
          )}
        </div>
      </div>
    </div>
  );
}
