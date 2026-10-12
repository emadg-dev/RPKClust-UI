import React from 'react';
import { AlertTriangle, CheckCircle2, SkipForward, XCircle } from 'lucide-react';
import { PipelineStage, PipelineTraceResponse } from '../../types';
import LoadStage from './stages/LoadStage';
import BoundaryStage from './stages/BoundaryStage';
import TaggingStage from './stages/TaggingStage';
import CandidatesStage from './stages/CandidatesStage';
import Stage1Panel from './stages/Stage1Panel';
import Stage2Panel from './stages/Stage2Panel';
import ClusterStage from './stages/ClusterStage';
import MetricsStage from './stages/MetricsStage';

interface StageDetailProps {
  stage: PipelineStage;
  overview: PipelineTraceResponse;
}

const STATUS_META: Record<string, { icon: React.ReactNode; label: string; classes: string }> = {
  ok: {
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    label: 'OK',
    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  warn: {
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    label: 'WARN',
    classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  error: {
    icon: <XCircle className="w-4 h-4 text-red-400" />,
    label: 'ERROR',
    classes: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
  skipped: {
    icon: <SkipForward className="w-4 h-4 text-slate-400" />,
    label: 'SKIPPED',
    classes: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  },
};

export default function StageDetail({ stage, overview }: StageDetailProps) {
  const meta = STATUS_META[stage.status] || STATUS_META.ok;
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-white text-base">{stage.name}</h3>
        <div className="flex items-center gap-2">
          {stage.attention.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              ⚠ {stage.attention.join(', ')}
            </span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${meta.classes}`}>
            {meta.label}
          </span>
          <span className="text-xs font-mono text-slate-400">{stage.ms.toFixed(1)} ms</span>
        </div>
      </div>

      {stage.status === 'error' && stage.error && (
        <div className="px-5 py-3 bg-red-950/40 border-b border-red-900/40">
          <div className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-1">
            Traceback
          </div>
          <pre className="text-[11px] font-mono text-red-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
            {stage.error}
          </pre>
        </div>
      )}

      <div className="p-5">
        {stage.id === 'load' && <LoadStage summary={overview.load} />}
        {stage.id === 'boundary' && <BoundaryStage summary={overview.boundary} />}
        {stage.id === 'tagging' && <TaggingStage summary={overview.tagging} />}
        {stage.id === 'candidates' && <CandidatesStage summary={overview.candidates} />}
        {stage.id === 'stage1' && <Stage1Panel directions={overview.stage1} />}
        {stage.id === 'stage2' && <Stage2Panel directions={overview.stage2} />}
        {stage.id === 'cluster' && <ClusterStage directions={overview.cluster} />}
        {stage.id === 'metrics' && <MetricsStage summary={overview.metrics} />}
      </div>
    </div>
  );
}
