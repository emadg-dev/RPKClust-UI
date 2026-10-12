import { useCallback, useRef, useState } from 'react';
import {
  ApiCallResult,
  MessageTraceResponse,
  PipelineTraceResponse,
} from '../types';

export type TraceRunState = 'idle' | 'loading' | 'ok' | 'error';

export type TraceMode = 'dataset' | 'custom';

export interface UsePipelineTraceReturn {
  overview: PipelineTraceResponse | null;
  overviewState: TraceRunState;
  overviewError: string;
  trace: MessageTraceResponse | null;
  traceState: TraceRunState;
  traceError: string;
  traceMessageId: number | null;
  cachedIds: number[];
  runOverview: () => Promise<void>;
  loadTrace: (messageId: number) => void;
}

const DEBOUNCE_MS = 150;

export function usePipelineTrace(
  executeApiCall: (payload: unknown, label?: string) => Promise<ApiCallResult>,
  sourceId: string,
  datasetId: string,
  customText: string,
  mode: TraceMode,
  maxMessages: number,
  params: Record<string, unknown>,
): UsePipelineTraceReturn {
  const [overview, setOverview] = useState<PipelineTraceResponse | null>(null);
  const [overviewState, setOverviewState] = useState<TraceRunState>('idle');
  const [overviewError, setOverviewError] = useState<string>('');
  const [trace, setTrace] = useState<MessageTraceResponse | null>(null);
  const [traceState, setTraceState] = useState<TraceRunState>('idle');
  const [traceError, setTraceError] = useState<string>('');
  const [traceMessageId, setTraceMessageId] = useState<number | null>(null);
  const [cachedIds, setCachedIds] = useState<number[]>([]);

  const cacheRef = useRef<Map<number, MessageTraceResponse>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);

  const buildInput = useCallback((): Record<string, unknown> => {
    if (mode === 'custom') {
      return { kind: 'custom', text: customText };
    }
    return {
      kind: 'dataset',
      source_id: sourceId,
      dataset_id: datasetId,
      max_messages: maxMessages,
    };
  }, [mode, sourceId, datasetId, customText, maxMessages]);

  const runOverview = useCallback(async () => {
    const runId = ++runIdRef.current;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    cacheRef.current.clear();
    setCachedIds([]);
    setTrace(null);
    setTraceState('idle');
    setTraceError('');
    setTraceMessageId(null);
    setOverviewState('loading');
    setOverviewError('');
    const { ok, data } = await executeApiCall(
      { cmd: 'pipeline_trace', input: buildInput(), config: params },
      `pipeline_${mode === 'custom' ? 'custom' : datasetId}`,
    );
    if (runId !== runIdRef.current) return;
    if (ok && data?.status === 'ok') {
      setOverview(data as PipelineTraceResponse);
      setOverviewState('ok');
    } else {
      setOverviewState('error');
      setOverviewError(
        (data as { message?: string })?.message || 'Pipeline trace failed',
      );
    }
  }, [executeApiCall, buildInput, params, mode, datasetId]);

  const loadTrace = useCallback(
    (messageId: number) => {
      const cached = cacheRef.current.get(messageId);
      if (cached) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setTrace(cached);
        setTraceState('ok');
        setTraceError('');
        setTraceMessageId(messageId);
        return;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setTraceState('loading');
      setTraceError('');
      timerRef.current = setTimeout(async () => {
        timerRef.current = null;
        const { ok, data } = await executeApiCall(
          {
            cmd: 'message_trace',
            input: buildInput(),
            config: params,
            message_id: messageId,
          },
          `trace_${messageId}`,
        );
        if (ok && data?.status === 'ok') {
          const resp = data as MessageTraceResponse;
          cacheRef.current.set(messageId, resp);
          setCachedIds(Array.from(cacheRef.current.keys()).sort((a, b) => a - b));
          setTrace(resp);
          setTraceState('ok');
          setTraceMessageId(messageId);
        } else {
          setTraceState('error');
          setTraceError(
            (data as { message?: string })?.message || 'Message trace failed',
          );
        }
      }, DEBOUNCE_MS);
    },
    [executeApiCall, buildInput, params],
  );

  return {
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
  };
}
