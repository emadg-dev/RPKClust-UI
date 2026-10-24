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
  RefreshCw,
  Loader2,
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
  onReRunBenchmarks: () => void;
  benchLoading: boolean;
  benchProgress: number;
  pipelineStage?: string;
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
  onReRunBenchmarks,
  benchLoading,
  benchProgress,
  pipelineStage,
}: HeaderProps) {
  return (
    <header className="border-b border-default bg-panel sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-1">
        
            <h1 className="text-xl font-bold tracking-tight text-hi">RPKClust Results & Benchmarks</h1>

      </div>

      <div className="flex items-left flex-wrap gap-2">
        

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
  onClick={() => onReRunBenchmarks()}
  disabled={benchLoading}
  title="Re-run evaluation"
  className="relative overflow-hidden px-3 pt-2 pb-2 h-10 w-50 btn-primary disabled:opacity-70 text-hi text-xs font-semibold rounded flex flex-col gap-1.5 transition"
>
  {/* Button content */}
  <div className="flex items-center justify-center gap-1.5 w-full">
    {benchLoading ? (
      <Loader2 className="w-3 h-3 animate-spin shrink-0" />
    ) : (
      <RefreshCw className="w-3 h-3 shrink-0" />
    )}

    <span>
      {benchLoading ? "Running Evaluation..." : "Re-run Evaluation"}
    </span>

    <span className="ml-auto text-[10px] font-semibold tabular-nums">
      {benchProgress}%
    </span>
  </div>

  {/* {benchLoading && pipelineStage && (
    <div className="w-full text-[9px] font-mono text-mid text-center truncate">
      {pipelineStage}
    </div>
  )} */}
</button>
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
