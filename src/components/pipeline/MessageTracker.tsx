import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import {
  MessageTraceResponse,
  PipelineTraceResponse,
} from '../../types';
import { TraceRunState } from '../../hooks/usePipelineTrace';
import ByteLensGrid, {
  LensKind,
  RULES,
  SAT_LENGTHS,
} from './ByteLensGrid';
import ByteInspector from './ByteInspector';
import CandidatePathTable from './CandidatePathTable';

interface MessageTrackerProps {
  overview: PipelineTraceResponse;
  trace: MessageTraceResponse | null;
  traceState: TraceRunState;
  traceMessageId: number | null;
  cachedIds: number[];
  loadTrace: (messageId: number) => void;
}

export default function MessageTracker({
  overview,
  trace,
  traceState,
  traceMessageId,
  cachedIds,
  loadTrace,
}: MessageTrackerProps) {
  const messages = overview.messages;
  const [selectedId, setSelectedId] = useState<number>(
    messages[0]?.id ?? 0,
  );
  const [selectedByte, setSelectedByte] = useState<number>(0);
  const [lens, setLens] = useState<LensKind>('region');
  const [satRule, setSatRule] = useState<string>('sparse');
  const [satLength, setSatLength] = useState<number>(1);

  const currentMsg = messages.find((m) => m.id === selectedId) || messages[0];

  useEffect(() => {
    if (currentMsg) {
      loadTrace(currentMsg.id);
      setSelectedByte(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const cachedSet = new Set(cachedIds);
  const histogram = trace
    ? trace.offset_histograms[String(selectedByte)]
    : undefined;

  const selectMessage = (index: number) => {
    if (index >= 0 && index < messages.length) {
      setSelectedId(messages[index].id);
    }
  };

  if (messages.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-xs text-slate-500">
          No messages in this capture.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            Message
          </span>
          <button
            onClick={() => selectMessage(Math.max(0, messages.findIndex((m) => m.id === selectedId) - 1))}
            disabled={messages.findIndex((m) => m.id === selectedId) <= 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            title="Previous message ( [ )"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 px-2 py-1.5 max-w-[280px]"
          >
            {messages.map((m) => (
              <option key={m.id} value={m.id}>
                #{m.id} · {m.direction} · len={m.length} · {m.cluster ?? 'unclassified'}
                {m.label ? ` · label=${m.label}` : ''}
                {cachedSet.has(m.id) ? ' · ✓cached' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              selectMessage(
                Math.min(messages.length - 1, messages.findIndex((m) => m.id === selectedId) + 1),
              )
            }
            disabled={
              messages.findIndex((m) => m.id === selectedId) >= messages.length - 1
            }
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            title="Next message ( ] )"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {traceState === 'loading' && (
            <span className="flex items-center gap-1.5 text-xs text-indigo-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              loading trace…
            </span>
          )}
          {traceMessageId !== null && trace && (
            <span className="text-[10px] font-mono text-slate-500">
              trace for msg {traceMessageId}
              {cachedSet.has(traceMessageId) ? ' (cached)' : ''}
            </span>
          )}
        </div>

        {currentMsg && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs font-mono text-slate-400">
            <span>
              direction: <span className="text-cyan-400">{currentMsg.direction}</span>
            </span>
            <span>length: <span className="text-slate-200">{currentMsg.length}</span></span>
            <span>
              session: <span className="text-slate-200">{currentMsg.session_id}</span>
            </span>
            <span>
              paired: <span className="text-slate-200">{currentMsg.paired_id ?? '–'}</span>
            </span>
            <span>
              cluster: <span className="text-slate-200">{currentMsg.cluster ?? '–'}</span>
            </span>
            <span>
              label: <span className="text-slate-200">{currentMsg.label ?? '–'}</span>
            </span>
            <span className="break-all">
              head: <span className="text-slate-300">{currentMsg.head_hex}</span>
            </span>
          </div>
        )}
      </div>

      {trace && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-slate-300">Lens</span>
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                {(
                  [
                    ['region', 'Region'],
                    ['status', 'Status'],
                    ['tags', 'Tags'],
                    ['in_S', 'In S'],
                    ['satisfaction', 'Satisfaction'],
                  ] as Array<[LensKind, string]>
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    onClick={() => setLens(kind)}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      lens === kind
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {lens === 'satisfaction' && (
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-slate-400">Rule</label>
                  <select
                    value={satRule}
                    onChange={(e) => setSatRule(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 px-2 py-1"
                  >
                    {RULES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <label className="text-[10px] text-slate-400">Length</label>
                  <select
                    value={satLength}
                    onChange={(e) => setSatLength(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 px-2 py-1"
                  >
                    {SAT_LENGTHS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <span className="ml-auto text-[10px] font-mono text-slate-500">
                byte {selectedByte} / {trace.bytes.length - 1}
              </span>
            </div>

            <ByteLensGrid
              bytes={trace.bytes}
              rules={trace.rules}
              trueKeyword={overview.meta.true_keyword}
              selectedByte={selectedByte}
              onSelectByte={setSelectedByte}
              onPrevMessage={() =>
                selectMessage(
                  Math.max(0, messages.findIndex((m) => m.id === selectedId) - 1),
                )
              }
              onNextMessage={() =>
                selectMessage(
                  Math.min(messages.length - 1, messages.findIndex((m) => m.id === selectedId) + 1),
                )
              }
              lens={lens}
              satRule={satRule}
              satLength={satLength}
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <ByteInspector
              rules={trace.rules}
              selectedByte={selectedByte}
              histogram={histogram}
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">
              Candidate path ({trace.candidate_path.length} candidates)
            </h4>
            {trace.final && (
              <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-xs font-mono text-slate-400">
                <span>
                  final cluster: <span className="text-cyan-400">{trace.final.cluster ?? '–'}</span>
                </span>
                <span>cluster size: <span className="text-slate-200">{trace.final.cluster_size}</span></span>
                <span>
                  keyword:{' '}
                  <span className="text-slate-200">
                    {trace.final.keyword
                      ? `${trace.final.keyword.offset}/${trace.final.keyword.length}`
                      : '–'}
                  </span>
                </span>
                <span>label: <span className="text-slate-200">{trace.final.label ?? '–'}</span></span>
                <span>
                  cluster pure:{' '}
                  <span className="text-slate-200">
                    {trace.final.cluster_pure === null ? '–' : trace.final.cluster_pure ? 'yes' : 'no'}
                  </span>
                </span>
              </div>
            )}
            <CandidatePathTable path={trace.candidate_path} />
          </div>
        </>
      )}

      {traceState === 'error' && (
        <div className="bg-red-950/40 border border-red-900/50 rounded-2xl p-4">
          <p className="text-xs text-red-300">
            Message trace failed. See the error card above for details.
          </p>
        </div>
      )}
    </div>
  );
}
