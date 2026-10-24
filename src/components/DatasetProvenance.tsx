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
  availableDatasets?: DatasetMeta[];
  selectedDataset?: string;
  setSelectedDataset?: (dataset: string) => void;
  currentDatasetMeta?: DatasetMeta | undefined;
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
    <div className="panel p-5 relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-start gap-3.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-low">
                Active Dataset Source:
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-accent2-wash-10 text-accent-soft border border-accent2-wash-30">
                {currentSource.name}
              </span>
             
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 shrink-0 bg-base p-1 rounded border border-default">
          {Object.values(sourcesCatalog).map((src) => (
            <button
              key={src.id}
              onClick={() => setSelectedSource(src.id)}
              className={`px-3 py-1.5 btn flex items-center gap-1.5 ${
                selectedSource === src.id
                  ? 'bg-accent text-hi'
                  : 'text-low hover-text-hi hover-bg-panel'
              }`}
            >
              <span>{src.short_name}</span>
              <span className="text-[10px] opacity-75 font-mono">({src.datasets.length})</span>
            </button>
          ))}
        </div>
      </div>

      {selectedSource === 'binaryinferno' && (
        <div className="mt-4 pt-4 border-t border-default mb-3">
          <div className="mb-3">
            <label className="text-xs font-bold text-mid flex items-center gap-1.5 mb-2">
              Message Count
            </label>
            <div className="flex flex-wrap gap-2">
              {[100, 500, 1000].map((count) => (
                <button
                  key={count}
                  onClick={() => setSelectedMsgCount(count)}
                  className={`px-3 py-1.5 btn border flex items-center gap-2 ${
                    selectedMsgCount === count
                      ? 'bg-emerald-dark border-emerald-strong text-emerald-hi'
                      : 'bg-base border-default text-low hover-text-hi hover-border-strong'
                  }`}
                >
                  <span>{count} msgs</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {(availableDatasets && availableDatasets.length > 0 && (selectedSource === 'binaryinferno' || selectedSource === 'netplier' || selectedSource === 'icsreal')) && (
        <div className="mt-4 pt-4 border-t border-default">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-mid flex items-center gap-1.5">
              Available PCAP Traces in {currentSource.short_name}:
            </span>
            <span className="text-[11px] text-low font-mono">
              Selected: <strong className="text-cyan-soft">{currentDatasetMeta?.name ?? availableDatasets[0]?.name ?? 'None'}</strong> ({currentDatasetMeta?.packets ?? availableDatasets[0]?.packets ?? 0} msgs)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableDatasets.map((d) => {
              const isSelected = selectedDataset === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDataset?.(d.id)}
                  className={`px-3 py-1.5 btn border flex items-center gap-2 ${
                    isSelected
                      ? 'bg-inset border-faint text-hi'
                      : 'bg-base border-default text-low hover-text-hi hover-border-strong'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-cyan animate-pulse' : 'bg-inset3'
                    }`}
                  />
                  <span>{d.name}</span>
                  <span className="text-[10px] font-mono px-1 rounded bg-panel text-low">
                    {d.packets}p
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
