import React from 'react';
import { FileCode, Play } from 'lucide-react';
import { ProtocolDetails } from '../../types';

interface CustomTraceTabProps {
  customText: string;
  setCustomText: (text: string) => void;
  customDetails: ProtocolDetails | null;
  runCustomTrace: () => void;
  loading: boolean;
}

export default function CustomTraceTab({
  customText,
  setCustomText,
  customDetails,
  runCustomTrace,
  loading,
}: CustomTraceTabProps) {
  return (
    <div className="space-y-6">
      <div className="panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-hi text-base flex items-center gap-2">
              <FileCode className="w-5 h-5 text-accent3" />
              Motivating Toy Trace &amp; Custom Hex Input
            </h3>
            <p className="text-xs text-low mt-0.5">
              Paste raw hex lines or test with the motivating toy trace.
            </p>
          </div>
          <button
            onClick={runCustomTrace}
            disabled={loading}
            className="px-4 py-2 btn-primary disabled:opacity-50 text-hi text-xs font-bold rounded flex items-center gap-2 transition"
          >
            <Play className="w-4 h-4" />
            Run RPKClust Pipeline
          </button>
        </div>

        <textarea
          rows={9}
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          className="w-full panel-inner p-4 font-mono text-xs text-cyan-soft focus:outline-none focus-border-stronger leading-relaxed"
          placeholder="Paste hex bytes per line (e.g. 05 64 0b c4 ... Read)"
        />

        {customDetails && (
          <div className="pt-4 border-t border-default grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3 bg-base rounded border border-default">
              <span className="text-low block">Boundary B:</span>
              <span className="text-base font-bold text-amber">
                {customDetails.boundary?.B} bytes
              </span>
            </div>
            <div className="p-3 bg-base rounded border border-default">
              <span className="text-low block">Inferred Keyword:</span>
              <span className="text-base font-bold text-cyan">
                Offset {customDetails.keywords?.['c2s']?.offset ?? customDetails.keywords?.['both']?.offset}
              </span>
            </div>
            <div className="p-3 bg-base rounded border border-default">
              <span className="text-low block">Clusters:</span>
              <span className="text-base font-bold text-emerald">
                {new Set(customDetails.sample_messages?.map((m) => m.cluster)).size} unique
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
