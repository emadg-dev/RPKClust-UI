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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-400" />
              Motivating Toy Trace &amp; Custom Hex Input
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste raw hex lines or test with the motivating toy trace.
            </p>
          </div>
          <button
            onClick={runCustomTrace}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition shadow-md shadow-indigo-600/30"
          >
            <Play className="w-4 h-4" />
            Run RPKClust Pipeline
          </button>
        </div>

        <textarea
          rows={9}
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-cyan-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
          placeholder="Paste hex bytes per line (e.g. 05 64 0b c4 ... Read)"
        />

        {customDetails && (
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block">Boundary B:</span>
              <span className="text-base font-bold text-amber-400">
                {customDetails.boundary?.B} bytes
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block">Inferred Keyword:</span>
              <span className="text-base font-bold text-cyan-400">
                Offset {customDetails.keywords?.['c2s']?.offset ?? customDetails.keywords?.['both']?.offset}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block">Clusters:</span>
              <span className="text-base font-bold text-emerald-400">
                {new Set(customDetails.sample_messages?.map((m) => m.cluster)).size} unique
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
