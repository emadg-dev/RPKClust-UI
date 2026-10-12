import React from 'react';
import {
  Binary,
  FolderArchive,
  ChevronDown,
  Check,
  Table,
  BarChart3,
  Layers,
  GitCompare,
  Cpu,
  FileCode,
  SlidersHorizontal,
  ExternalLink,
  Activity,
  Boxes,
} from 'lucide-react';
import { SourceMeta, ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  sourcesCatalog: Record<string, SourceMeta>;
  selectedSource: string;
  setSelectedSource: (source: string) => void;
  sourceDropdownOpen: boolean;
  setSourceDropdownOpen: (open: boolean) => void;
  currentSource: SourceMeta;
  showKnobs: boolean;
  setShowKnobs: (show: boolean) => void;
}

const TAB_ITEMS: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
  { id: 'results', label: 'Results', icon: <Table className="w-4 h-4" /> },
  { id: 'charts', label: 'Charts', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'inspector', label: 'Region Inspector', icon: <Layers className="w-4 h-4" /> },
  { id: 'pairwise', label: 'Pairwise Inspector', icon: <GitCompare className="w-4 h-4" /> },
  { id: 'stage2', label: 'Stage 1 & 2 Math', icon: <Cpu className="w-4 h-4" /> },
  { id: 'custom', label: 'Custom Trace', icon: <FileCode className="w-4 h-4" /> },
  { id: 'pipeline', label: 'Pipeline', icon: <Activity className="w-4 h-4" /> },
  { id: 'clusters', label: 'Clusters', icon: <Boxes className="w-4 h-4" /> },
];

export default function Header({
  activeTab,
  setActiveTab,
  sourcesCatalog,
  selectedSource,
  setSelectedSource,
  sourceDropdownOpen,
  setSourceDropdownOpen,
  currentSource,
  showKnobs,
  setShowKnobs,
}: HeaderProps) {
  return (
    <header className="border-b border-default bg-panel sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-inset flex items-center justify-center text-hi">
          <Binary className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-hi">RPKClust Results & Benchmarks</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-accent2-wash-10 text-accent3 border border-accent2-wash-20 rounded">
              The Computer Journal 2025
            </span>
          </div>
          <p className="text-xs text-low">
            Region-Partitioned Keywords Inference with Empirical Evaluation &amp; Hyperparameter Controls
          </p>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-3">
        <div className="relative">
          <button
            onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded btn-ghost border border-strong text-xs font-medium text-hi transition"
            title="Change PCAP Source / Capture Archive"
          >
            <FolderArchive className="w-4 h-4 text-cyan" />
            <div className="text-left">
              <span className="text-[10px] text-low block -mb-0.5 uppercase tracking-wider font-semibold">
                PCAP Source
              </span>
              <span className="font-bold text-hi flex items-center gap-1.5">
                {currentSource.short_name}
                <span className="px-1.5 py-0.2 text-[10px] bg-inset2 rounded text-cyan-soft font-mono">
                  {currentSource.datasets.length}
                </span>
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-low ml-1" />
          </button>

          {sourceDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-panel border border-strong rounded z-50 overflow-hidden">
              <div className="px-3 py-2 bg-base border-b border-default text-[11px] font-semibold text-low uppercase tracking-wider flex justify-between items-center">
                <span>Select PCAP Archive / Source</span>
                <span className="text-cyan font-mono">{Object.keys(sourcesCatalog).length} Sources Available</span>
              </div>
              <div className="p-1.5 space-y-1">
                {Object.values(sourcesCatalog).map((src) => {
                  const isSelected = selectedSource === src.id;
                  return (
                    <button
                      key={src.id}
                      onClick={() => {
                        setSelectedSource(src.id);
                        setSourceDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded text-xs transition flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-inset border border-stronger text-hi'
                          : 'hover-bg-inset text-mid'
                      }`}
                    >
                      <div
                        className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-accent2 text-hi' : 'bg-inset text-low'
                        }`}
                      >
                        <FolderArchive className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold truncate">{src.short_name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-inset text-low font-mono">
                            {src.datasets.length} traces
                          </span>
                        </div>
                        <p className="text-[11px] text-low truncate mt-0.5">{src.citation}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-accent3 shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex bg-base p-1 rounded border border-default text-xs">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
                activeTab === tab.id ? 'bg-accent text-hi' : 'text-low hover-text-hi'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowKnobs(!showKnobs)}
          className={`px-3 py-2 rounded text-xs font-semibold flex items-center gap-2 border transition ${
            showKnobs
              ? 'bg-amber-wash text-amber-soft border-amber-wash-40'
              : 'btn-ghost text-mid border-strong'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Hyperparameters Knobs
        </button>
      </div>
    </header>
  );
}
