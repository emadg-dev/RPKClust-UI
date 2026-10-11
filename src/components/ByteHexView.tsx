import React from 'react';
import { Binary } from 'lucide-react';
import { SampleMessage, ProtocolDetails } from '../types';

interface ByteHexViewProps {
  activeMsg: SampleMessage | null;
  boundaryB: number;
  currentDetails?: ProtocolDetails | null;
  selectedMessage: number;
  messages: SampleMessage[];
  onMessageChange: (idx: number) => void;
}

export default function ByteHexView({
  activeMsg,
  boundaryB,
  currentDetails,
  selectedMessage,
  messages,
  onMessageChange,
}: ByteHexViewProps) {
  return (
    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Binary className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-white">Byte-Level Message Region Highlighting</h3>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" />
            <span className="text-amber-300">FOR (Offset 0..{boundaryB - 1})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-500/30 border border-orange-500/50" />
            <span className="text-orange-300">NFOR</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-500/40 border border-cyan-400" />
            <span className="text-cyan-300">Inferred Keyword</span>
          </span>
        </div>
      </div>

      {activeMsg ? (
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs overflow-x-auto space-y-2">
          <div className="text-slate-400 text-xs flex justify-between border-b border-slate-800 pb-2">
            <span>Message #{activeMsg.id} ({activeMsg.direction})</span>
            <span>Length: {activeMsg.length} bytes | Cluster: {activeMsg.cluster}</span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {Array.from({ length: activeMsg.length }).map((_, byteIdx) => {
              const hexByte = activeMsg.hex.slice(byteIdx * 2, byteIdx * 2 + 2);
              const isFOR = byteIdx < boundaryB;
              const kwOff =
                currentDetails?.keywords?.['c2s']?.offset ??
                currentDetails?.keywords?.['both']?.offset;
              const kwLen =
                currentDetails?.keywords?.['c2s']?.length ??
                currentDetails?.keywords?.['both']?.length ??
                1;
              const isKeyword =
                kwOff !== null &&
                kwOff !== undefined &&
                byteIdx >= kwOff &&
                byteIdx < kwOff + kwLen;

              let bgClass = isFOR
                ? 'bg-amber-950/40 text-amber-200 border-amber-700/50'
                : 'bg-orange-950/40 text-orange-200 border-orange-700/50';

              if (isKeyword) {
                bgClass = 'bg-cyan-500/30 text-cyan-200 border-cyan-400 ring-1 ring-cyan-400';
              }

              return (
                <div
                  key={byteIdx}
                  className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all hover:scale-110 ${bgClass}`}
                  title={`Byte Offset: ${byteIdx} (0x${byteIdx.toString(16)})\nRegion: ${
                    isFOR ? 'FOR' : 'NFOR'
                  }${isKeyword ? ' (Keyword Field)' : ''}`}
                >
                  <span className="text-[10px] text-slate-500">{byteIdx}</span>
                  <span className="font-bold text-sm tracking-wider uppercase">{hexByte}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 rounded-xl p-8 border border-slate-800 text-center text-slate-500 text-xs font-mono">
          No message loaded. Select a dataset above.
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-slate-400">
          Viewing packet <strong className="text-white">{selectedMessage + 1}</strong> of <strong className="text-white">{messages.length}</strong>
        </span>
        <div className="flex gap-2">
          <button
            disabled={selectedMessage === 0}
            onClick={() => onMessageChange(Math.max(0, selectedMessage - 1))}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs rounded font-medium"
          >
            Previous
          </button>
          <button
            disabled={selectedMessage >= messages.length - 1}
            onClick={() => onMessageChange(Math.min(messages.length - 1, selectedMessage + 1))}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs rounded font-medium"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
