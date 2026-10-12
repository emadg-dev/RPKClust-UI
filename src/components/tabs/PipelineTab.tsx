import React, { useState } from 'react';
import { Play, AlertCircle, CheckCircle2, Activity } from 'lucide-react';
import { ApiCallResult, Hyperparameters } from '../../types';
import { FIG1_HEX } from '../../constants';
import { usePipelineTrace } from '../../hooks/usePipelineTrace';
import PipelineFlow from '../pipeline/PipelineFlow';
import StageDetail from '../pipeline/StageDetail';
import HealthChecks from '../pipeline/HealthChecks';
import MessageTracker from '../pipeline/MessageTracker';

export type PipelineMode = 'dataset' | 'custom';

interface PipelineTabProps {
  executeApiCall: (payload: unknown, label?: string) => Promise<ApiCallResult>;
  sourceId: string;
  datasetId: string;
  maxMessages: number;
  params: Hyperparameters;
}

export default function PipelineTab({
  executeApiCall,
  sourceId,
  datasetId,
  maxMessages,
  params,
}: PipelineTabProps) {
  const [mode, setMode] = useState<PipelineMode>('dataset');
  const [customText, setCustomText] = useState<string>(FIG1_HEX);
  const [selectedStage, setSelectedStage] = useState<string>('load');

  const serialized: Record<string, unknown> = {
    fo_lengths_for_candidates: params.fo_lengths_for_candidates,
    sparse_ratio: params.sparse_ratio,
    stage1_top_k: params.stage1_top_k,
    sim_sample_size: params.sim_sample_size,
    pos_for: [params.pos_for_base, params.pos_for_slope, params.pos_for_floor],
    pos_nfor: params.pos_nfor,
    bituse_endian: params.bituse_endian,
    for_exclude_rules: params.enabled_detectors.filter((d) => d !== 'sparse'),
  };

  const {
    overview,
    overviewState,
    overviewError,
    trace,
    traceState,
    traceError,
    traceMessageId,
    cachedIds,
    runOverview,
    loadTrace,
  } = usePipelineTrace(
    executeApiCall,
    sourceId,
    datasetId,
    customText,
    mode,
    maxMessages,
    serialized,
  );

  const selectedStageObj = overview?.stages.find((s) => s.id === selectedStage)
    || overview?.stages[0]
    || null;

  return (
    <div className="space-y-6">
      <div className="panel p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-hi text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent3" />
            Pipeline Tracker
          </h2>
          <p className="text-xs text-low mt-0.5">
            Stage-by-stage trace of the RPKClust analysis
            {mode === 'dataset'
              ? ` — ${sourceId}/${datasetId} (max ${maxMessages} msgs)`
              : ' — custom hex trace'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-base p-0.5 rounded border border-default text-xs">
            {(
              [
                ['dataset', 'Dataset'],
                ['custom', 'Custom hex'],
              ] as Array<[PipelineMode, string]>
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  mode === m
                    ? 'bg-accent text-hi'
                    : 'text-low hover-text-hi'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setSelectedStage('load');
              void runOverview();
            }}
            disabled={overviewState === 'loading'}
            className="px-4 py-2 rounded btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-hi text-xs font-semibold flex items-center gap-2 transition"
          >
            <Play className="w-4 h-4" />
            {overviewState === 'loading' ? 'Running…' : 'Run Pipeline Trace'}
          </button>
        </div>
      </div>

      {mode === 'custom' && (
        <div className="panel p-4">
          <label className="text-xs font-semibold text-mid block mb-1.5">
            Custom hex trace (one message per line, hex bytes)
          </label>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={4}
            spellCheck={false}
            className="w-full input p-2.5 focus:outline-none focus-border-stronger"
          />
        </div>
      )}

      {overviewState === 'idle' && (
        <div className="bg-panel border border-dashed border-strong rounded-md p-12 text-center">
          <Activity className="w-10 h-10 text-fainter mx-auto mb-3" />
          <h3 className="font-bold text-hi text-base mb-1">
            No pipeline trace yet
          </h3>
          <p className="text-xs text-low max-w-md mx-auto">
            Run the pipeline trace to inspect every stage — boundary detection,
            semantic tagging, candidate generation, stage 1/2 constraints,
            clustering and evaluation — plus a per-message byte-level tracker.
          </p>
          <button
            onClick={() => void runOverview()}
            className="mt-4 px-4 py-2 rounded btn-primary text-xs font-semibold flex items-center gap-2 mx-auto"
          >
            <Play className="w-4 h-4" />
            Run Pipeline Trace
          </button>
        </div>
      )}

      {overviewState === 'error' && (
        <div className="bg-red-dark-wash border border-red-abyss-wash-50 rounded-md p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-soft text-sm">Pipeline trace failed</h3>
            <p className="text-xs text-red-hi-80 font-mono mt-1 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {overviewError}
            </p>
          </div>
        </div>
      )}

      {overviewState === 'loading' && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['load', 'boundary', 'tagging', 'candidates', 'stage1', 'stage2', 'cluster', 'metrics'].map(
            (id) => (
              <div
                key={id}
                className="min-w-[132px] px-3 py-2.5 rounded border border-default bg-panel animate-pulse"
              >
                <div className="h-2.5 w-16 bg-inset rounded mb-2" />
                <div className="h-3.5 w-24 bg-inset rounded mb-1.5" />
                <div className="h-2.5 w-20 bg-inset rounded" />
              </div>
            ),
          )}
        </div>
      )}

      {overview && (
        <>
          <PipelineFlow
            stages={overview.stages}
            selectedId={selectedStageObj?.id || 'load'}
            onSelect={setSelectedStage}
            loading={overviewState === 'loading'}
          />

          {selectedStageObj && (
            <StageDetail stage={selectedStageObj} overview={overview} />
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <HealthChecks items={overview.health} />
            </div>
            <div className="panel p-5">
              <h3 className="font-bold text-hi text-base mb-3">
                Consistency check
              </h3>
              <div className="flex items-center gap-2 mb-2">
                {overview.consistency.ok ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald" />
                    <span className="text-xs text-emerald font-semibold">
                      Recomputed posteriors match the pipeline (abs tol 1e-9)
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber" />
                    <span className="text-xs text-amber font-semibold">
                      {overview.consistency.mismatches.length} mismatch(es)
                    </span>
                  </>
                )}
              </div>
              {overview.consistency.skipped.length > 0 && (
                <p className="text-[11px] text-low">
                  Skipped (cannot recompute exactly):{' '}
                  <span className="font-mono">
                    {overview.consistency.skipped.join(', ')}
                  </span>
                </p>
              )}
              {overview.consistency.mismatches.length > 0 && (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-low text-left border-b border-default">
                        <th className="py-1 pr-2">Direction</th>
                        <th className="py-1 pr-2">Candidate</th>
                        <th className="py-1 pr-2">Field</th>
                        <th className="py-1 pr-2">Pipeline</th>
                        <th className="py-1">Recomputed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.consistency.mismatches.map((m, i) => (
                        <tr key={i} className="border-b border-default-wash text-hi">
                          <td className="py-1 pr-2">{m.direction}</td>
                          <td className="py-1 pr-2">{m.candidate}</td>
                          <td className="py-1 pr-2">{m.field}</td>
                          <td className="py-1 pr-2">{m.pipeline}</td>
                          <td className="py-1">{m.recomputed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-3 text-[11px] text-faint">
                <div>
                  config fingerprint:{' '}
                  <span className="font-mono text-low">
                    {overview.meta.config_fingerprint}
                  </span>
                </div>
                {Object.keys(overview.meta.config_nondefault).length > 0 && (
                  <div className="mt-1">
                    non-default config:{' '}
                    <span className="font-mono text-low">
                      {JSON.stringify(overview.meta.config_nondefault)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <MessageTracker
            overview={overview}
            trace={trace}
            traceState={traceState}
            traceMessageId={traceMessageId}
            cachedIds={cachedIds}
            loadTrace={loadTrace}
          />

          {traceState === 'error' && (
            <div className="bg-red-dark-wash border border-red-abyss-wash-50 rounded-md p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-soft text-sm">
                  Message trace failed
                </h3>
                <p className="text-xs text-red-hi-80 font-mono mt-1 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {traceError}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
