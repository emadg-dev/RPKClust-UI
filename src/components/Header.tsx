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
  { id: 'custom', label: 'Fig 1 & Custom', icon: <FileCode className="w-4 h-4" /> },
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
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
          <Binary className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">RPKClust Results & Benchmarks</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
              The Computer Journal 2025
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Region-Partitioned Keywords Inference with Empirical Evaluation &amp; Hyperparameter Controls
          </p>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-3">
        <div className="relative">
          <button
            onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition shadow-sm"
            title="Change PCAP Source / Capture Archive"
          >
            <FolderArchive className="w-4 h-4 text-cyan-400" />
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block -mb-0.5 uppercase tracking-wider font-semibold">
                PCAP Source
              </span>
              <span className="font-bold text-white flex items-center gap-1.5">
                {currentSource.short_name}
                <span className="px-1.5 py-0.2 text-[10px] bg-slate-700 rounded text-cyan-300 font-mono">
                  {currentSource.datasets.length}
                </span>
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {sourceDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                <span>Select PCAP Archive / Source</span>
                <span className="text-cyan-400 font-mono">{Object.keys(sourcesCatalog).length} Sources Available</span>
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
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                          : 'hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div
                        className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <FolderArchive className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold truncate">{src.short_name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {src.datasets.length} traces
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{src.citation}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
                activeTab === tab.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowKnobs(!showKnobs)}
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition shadow-sm ${
            showKnobs
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Hyperparameters Knobs
        </button>
      </div>
    </header>
  );
}
