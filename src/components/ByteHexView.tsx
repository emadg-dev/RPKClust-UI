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
    <div className="lg:col-span-2 panel p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Binary className="w-5 h-5 text-accent3" />
          <h3 className="font-semibold text-hi">Byte-Level Message Region Highlighting</h3>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-wash-30 border border-amber-wash-50" />
            <span className="text-amber-soft">FOR (Offset 0..{boundaryB - 1})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-wash-30 border border-orange-wash-50" />
            <span className="text-orange-soft">NFOR</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-wash-40 border border-cyan" />
            <span className="text-cyan-soft">Inferred Keyword</span>
          </span>
        </div>
      </div>

      {activeMsg ? (
        <div className="bg-base rounded p-4 border border-default font-mono text-xs overflow-x-auto space-y-2">
          <div className="text-low text-xs flex justify-between border-b border-default pb-2">
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
                ? 'bg-amber-dark-wash-40 text-amber-hi border-amber-strong-wash'
                : 'bg-orange-dark-wash text-orange-hi border-orange-strong-wash';

              if (isKeyword) {
                bgClass = 'bg-cyan-wash-30 text-cyan-hi border-cyan';
              }

              return (
                <div
                  key={byteIdx}
                  className={`flex flex-col items-center justify-center p-1.5 rounded border transition ${bgClass}`}
                  title={`Byte Offset: ${byteIdx} (0x${byteIdx.toString(16)})\nRegion: ${
                    isFOR ? 'FOR' : 'NFOR'
                  }${isKeyword ? ' (Keyword Field)' : ''}`}
                >
                  <span className="text-[10px] text-faint">{byteIdx}</span>
                  <span className="font-bold text-sm tracking-wider uppercase">{hexByte}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-base rounded p-8 border border-default text-center text-faint text-xs font-mono">
          No message loaded. Select a dataset above.
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-low">
          Viewing packet <strong className="text-hi">{selectedMessage + 1}</strong> of <strong className="text-hi">{messages.length}</strong>
        </span>
        <div className="flex gap-2">
          <button
            disabled={selectedMessage === 0}
            onClick={() => onMessageChange(Math.max(0, selectedMessage - 1))}
            className="px-3 py-1 btn-ghost disabled:opacity-40 text-xs rounded font-medium"
          >
            Previous
          </button>
          <button
            disabled={selectedMessage >= messages.length - 1}
            onClick={() => onMessageChange(Math.min(messages.length - 1, selectedMessage + 1))}
            className="px-3 py-1 btn-ghost disabled:opacity-40 text-xs rounded font-medium"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
