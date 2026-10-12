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
  ok: <CheckCircle2 className="w-4 h-4 text-emerald" />,
  warn: <AlertTriangle className="w-4 h-4 text-amber" />,
  error: <XCircle className="w-4 h-4 text-red" />,
  skipped: <SkipForward className="w-4 h-4 text-faint" />,
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
                <div className="w-4 h-0.5 bg-inset2" />
              </div>
            )}
            <button
              onClick={() => onSelect(s.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded border text-left transition shrink-0 min-w-[132px] ${
                selected
                  ? 'bg-accent-dark border-accent-strong'
                  : 'bg-panel border-default hover-border-strong'
              }`}
            >
              {loading && !s.ms ? (
                <Loader2 className="w-4 h-4 text-accent3 animate-spin" />
              ) : (
                STATUS_ICON[s.status] || STATUS_ICON.ok
              )}
              <div className="min-w-0">
                <div className="label font-semibold">
                  {s.id}
                </div>
                <div className="text-xs font-semibold text-hi truncate">
                  {s.name}
                </div>
                <div className="text-[10px] font-mono text-low truncate">
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
