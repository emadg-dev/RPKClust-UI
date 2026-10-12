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
      <div className="panel p-6 space-y-4">
        <h3 className="font-semibold text-hi flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber" />
          Boundary Detection Diagnostics
        </h3>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex justify-between p-2.5 rounded bg-base border border-default">
            <span className="text-low">Inferred Boundary B:</span>
            <span className="font-bold text-amber">{boundaryB} bytes</span>
          </div>
          <div className="flex justify-between p-2.5 rounded bg-base border border-default">
            <span className="text-low">Minimum Packet Len:</span>
            <span className="font-bold text-hi">
              {minLen ?? 0} bytes
            </span>
          </div>
          <div className="flex justify-between p-2.5 rounded bg-base border border-default">
            <span className="text-low">Generated Candidates:</span>
            <span className="font-bold text-cyan">
              {candidateCount ?? 0} fields
            </span>
          </div>
        </div>
      </div>

      <div className="panel p-6 space-y-4">
        <h3 className="font-semibold text-hi flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent3" />
          Semantic Exclusion Hits ({hits.length})
        </h3>

        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
          {hits.map((hit, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded bg-base border border-default flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-accent3 uppercase">{hit.rule}</span>
                <span className="text-low ml-2">
                  Offset {hit.offset} (Len {hit.length})
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-panel text-faint border border-default">
                Excluded
              </span>
            </div>
          ))}
          {hits.length === 0 && (
            <div className="text-faint text-center py-4">No detector exclusions fired</div>
          )}
        </div>
      </div>
    </div>
  );
}
