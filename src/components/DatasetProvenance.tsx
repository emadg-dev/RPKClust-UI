import React from 'react';
import { FolderArchive, ExternalLink, Database, RotateCcw } from 'lucide-react';
import { SourceMeta, DatasetMeta } from '../types';

interface DatasetProvenanceProps {
  currentSource: SourceMeta;
  sourcesCatalog: Record<string, SourceMeta>;
  selectedSource: string;
  setSelectedSource: (source: string) => void;
  selectedMsgCount: number;
  setSelectedMsgCount: (count: number) => void;
  availableDatasets: DatasetMeta[];
  selectedDataset: string;
  setSelectedDataset: (dataset: string) => void;
  currentDatasetMeta: DatasetMeta | undefined;
}

export default function DatasetProvenance({
  currentSource,
  sourcesCatalog,
  selectedSource,
  setSelectedSource,
  selectedMsgCount,
  setSelectedMsgCount,
  availableDatasets,
  selectedDataset,
  setSelectedDataset,
  currentDatasetMeta,
}: DatasetProvenanceProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Dataset Source:
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                {currentSource.name}
              </span>
              <a
                href={currentSource.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 underline font-mono"
              >
                <span>{currentSource.citation}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              {currentSource.description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 shrink-0 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {Object.values(sourcesCatalog).map((src) => (
            <button
              key={src.id}
              onClick={() => setSelectedSource(src.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                selectedSource === src.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>{src.short_name}</span>
              <span className="text-[10px] opacity-75 font-mono">({src.datasets.length})</span>
            </button>
          ))}
        </div>
      </div>

      {selectedSource === 'binaryinferno' && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 mb-3">
          <div className="mb-3">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              Message Count
            </label>
            <div className="flex flex-wrap gap-2">
              {[100, 500, 1000].map((count) => (
                <button
                  key={count}
                  onClick={() => setSelectedMsgCount(count)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border flex items-center gap-2 ${
                    selectedMsgCount === count
                      ? 'bg-emerald-900/60 border-emerald-500/60 text-white shadow-sm ring-1 ring-emerald-500/30'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>{count} msgs</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            Available PCAP Traces in {currentSource.short_name}:
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Selected: <strong className="text-cyan-300">{currentDatasetMeta?.name}</strong> ({currentDatasetMeta?.packets} msgs)
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableDatasets.map((d) => {
            const isSelected = selectedDataset === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDataset(d.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border flex items-center gap-2 ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-900/60 to-indigo-900/60 border-cyan-500/60 text-white shadow-sm ring-1 ring-cyan-500/30'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
                <span>{d.name}</span>
                <span className="text-[10px] font-mono px-1 rounded bg-slate-900/80 text-slate-400">
                  {d.packets}p
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
