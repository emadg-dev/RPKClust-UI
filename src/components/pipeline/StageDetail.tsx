import React from 'react';
import { AlertTriangle, CheckCircle2, SkipForward, XCircle } from 'lucide-react';
import { PipelineStage, PipelineTraceResponse } from '../../types';
import LoadStage from './stages/LoadStage';
import TaggingStage from './stages/TaggingStage';
import CandidatesStage from './stages/CandidatesStage';
import Stage1Panel from './stages/Stage1Panel';
import ClusterStage from './stages/ClusterStage';
import CandidateRankingView from '../CandidateRankingView';
import BoundaryDisplay from '../BoundaryDisplay';
import ClusteringMetricsView from '../ClusteringMetricsView';

interface StageDetailProps {
  stage: PipelineStage;
  overview: PipelineTraceResponse;
}

const STATUS_META: Record<string, { icon: React.ReactNode; label: string; classes: string }> = {
  ok: {
    icon: <CheckCircle2 className="w-4 h-4 text-emerald" />,
    label: 'OK',
    classes: 'bg-emerald-wash-10 text-emerald border-emerald-wash-30',
  },
  warn: {
    icon: <AlertTriangle className="w-4 h-4 text-amber" />,
    label: 'WARN',
    classes: 'bg-amber-wash-10 text-amber border-amber-wash-30',
  },
  error: {
    icon: <XCircle className="w-4 h-4 text-red" />,
    label: 'ERROR',
    classes: 'bg-red-wash-10 text-red border-red-wash-30',
  },
  skipped: {
    icon: <SkipForward className="w-4 h-4 text-low" />,
    label: 'SKIPPED',
    classes: 'bg-faint-wash text-low border-faint-wash',
  },
};

export default function StageDetail({ stage, overview }: StageDetailProps) {
  const meta = STATUS_META[stage.status] || STATUS_META.ok;
  return (
    <div className="panel overflow-hidden">
      <div className="px-5 py-4 border-b border-default flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-hi text-base">{stage.name}</h3>
        <div className="flex items-center gap-2">
          {stage.attention.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-wash-10 text-amber border border-amber-wash-30">
              ⚠ {stage.attention.join(', ')}
            </span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${meta.classes}`}>
            {meta.label}
          </span>
          <span className="text-xs font-mono text-low">{stage.ms.toFixed(1)} ms</span>
        </div>
      </div>

      {stage.status === 'error' && stage.error && (
        <div className="px-5 py-3 bg-red-dark-wash border-b border-red-abyss-wash-40">
          <div className="text-[10px] uppercase tracking-wider text-red font-semibold mb-1">
            Traceback
          </div>
          <pre className="text-[11px] font-mono text-red-hi whitespace-pre-wrap max-h-48 overflow-y-auto">
            {stage.error}
          </pre>
        </div>
      )}

      <div className="p-5">
        {stage.id === 'load' && <LoadStage summary={overview.load} />}
        {stage.id === 'boundary' && <BoundaryDisplay variant="pipeline" summary={overview.boundary} />}
        {stage.id === 'tagging' && <TaggingStage summary={overview.tagging} />}
        {stage.id === 'candidates' && <CandidatesStage summary={overview.candidates} />}
        {stage.id === 'stage1' && <Stage1Panel directions={overview.stage1} />}
        {stage.id === 'stage2' && <CandidateRankingView mode="detailed" directions={overview.stage2} />}
        {stage.id === 'cluster' && <ClusterStage directions={overview.cluster} />}
        {stage.id === 'metrics' && <ClusteringMetricsView variant="pipeline" metrics={overview.metrics} />}
      </div>
    </div>
  );
}
