import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  SkipForward,
  Loader2,
} from 'lucide-react';
import { PipelineStage } from '../../types';

interface PipelineFlowProps {
  stages: PipelineStage[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading: boolean;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  ok: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  warn: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
  skipped: <SkipForward className="w-4 h-4 text-slate-500" />,
};

export default function PipelineFlow({ stages, selectedId, onSelect, loading }: PipelineFlowProps) {
  return (
    <div className="flex items-stretch gap-0 overflow-x-auto pb-1">
      {stages.map((s, i) => {
        const selected = s.id === selectedId;
        return (
          <React.Fragment key={s.id}>
            {i > 0 && (
              <div className="flex items-center px-1">
                <div className="w-4 h-0.5 bg-slate-700" />
              </div>
            )}
            <button
              onClick={() => onSelect(s.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition shrink-0 min-w-[132px] ${
                selected
                  ? 'bg-indigo-600/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              {loading && !s.ms ? (
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              ) : (
                STATUS_ICON[s.status] || STATUS_ICON.ok
              )}
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  {s.id}
                </div>
                <div className="text-xs font-semibold text-white truncate">
                  {s.name}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  {s.headline}
                  {s.ms > 0 && ` · ${s.ms.toFixed(0)}ms`}
                </div>
              </div>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
