import { useState, useMemo } from 'react';
import { StderrLogEntry, LastApiStatus, ApiCallResult, DrawerHeight, LogTab } from '../types';

export interface UseApiCallReturn {
  stderrLogs: StderrLogEntry[];
  lastApiStatus: LastApiStatus | null;
  autoExpandOnError: boolean;
  stderrDrawerOpen: boolean;
  drawerHeight: DrawerHeight;
  activeLogTab: LogTab;
  stderrFilterSearch: string;
  copiedStderr: boolean;

  errorCount: number;
  warningCount: number;
  filteredLogs: StderrLogEntry[];
  rawCombinedStderr: string;

  executeApiCall: (payload: any, label?: string) => Promise<ApiCallResult>;
  simulateError: () => Promise<void>;
  clearStderrLogs: () => void;
  copyAllStderr: () => void;

  setStderrDrawerOpen: (open: boolean) => void;
  setAutoExpandOnError: (val: boolean) => void;
  setDrawerHeight: (h: DrawerHeight) => void;
  setActiveLogTab: (tab: LogTab) => void;
  setStderrFilterSearch: (val: string) => void;
}

export function useApiCall(): UseApiCallReturn {
  const [stderrLogs, setStderrLogs] = useState<StderrLogEntry[]>([]);
  const [lastApiStatus, setLastApiStatus] = useState<LastApiStatus | null>(null);
  const [autoExpandOnError, setAutoExpandOnError] = useState<boolean>(true);
  const [stderrDrawerOpen, setStderrDrawerOpen] = useState<boolean>(false);
  const [drawerHeight, setDrawerHeight] = useState<DrawerHeight>('medium');
  const [activeLogTab, setActiveLogTab] = useState<LogTab>('all');
  const [stderrFilterSearch, setStderrFilterSearch] = useState<string>('');
  const [copiedStderr, setCopiedStderr] = useState<boolean>(false);

  const executeApiCall = async (payload: any, label?: string): Promise<ApiCallResult> => {
    const tStart = performance.now();
    const cmd = payload.cmd || 'run';
    const target = payload.dataset_id || payload.protocol || payload.source_id || label;
    const timeStr = new Date().toLocaleTimeString();

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const durationMs = Math.round(performance.now() - tStart);
      const data = await res.json();
      const hasError = !res.ok || data.status === 'error';
      const stderrContent = (data.stderr || data.trace || (data.status === 'error' ? data.message : '') || '').trim();

      setLastApiStatus({
        command: cmd,
        target,
        durationMs,
        ok: !hasError,
        hasStderr: stderrContent.length > 0,
      });

      if (stderrContent || hasError) {
        const newLog: StderrLogEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: timeStr,
          command: cmd,
          target,
          source_id: payload.source_id,
          status: hasError ? 'error' : 'warning',
          httpCode: res.status,
          durationMs,
          message: data.message || (hasError ? 'Execution failed' : 'Execution completed with stderr diagnostics'),
          stderr: stderrContent || `Command ${cmd} returned HTTP ${res.status}`,
        };

        setStderrLogs((prev) => [newLog, ...prev]);

        if (hasError && autoExpandOnError) {
          setStderrDrawerOpen(true);
        }
      }

      return { ok: !hasError, data };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - tStart);
      const errMsg = err?.message || 'Network communication failure or dev server process exit';

      setLastApiStatus({
        command: cmd,
        target,
        durationMs,
        ok: false,
        hasStderr: true,
      });

      const newLog: StderrLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: timeStr,
        command: cmd,
        target,
        source_id: payload.source_id,
        status: 'error',
        httpCode: 0,
        durationMs,
        message: 'Network error or process crash',
        stderr: `Failed to communicate with /api/run:\n${errMsg}`,
      };

      setStderrLogs((prev) => [newLog, ...prev]);

      if (autoExpandOnError) {
        setStderrDrawerOpen(true);
      }

      return { ok: false, data: { status: 'error', message: errMsg, stderr: errMsg } };
    }
  };

  const simulateError = async () => {
    await executeApiCall(
      {
        cmd: 'simulate_error',
        message: 'Simulated pipeline failure in rpkclust.pipeline.run_pipeline: [Errno 2] Ground-truth mismatch during candidate generation at offset 12',
      },
      'debug_test'
    );
  };

  const clearStderrLogs = () => {
    setStderrLogs([]);
  };

  const copyAllStderr = () => {
    const text = stderrLogs
      .map((l) => `[${l.timestamp}] [${l.command} - ${l.target || 'default'}] [HTTP ${l.httpCode || 0}]\n${l.stderr}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    setCopiedStderr(true);
    setTimeout(() => setCopiedStderr(false), 2000);
  };

  const errorCount = stderrLogs.filter((l) => l.status === 'error').length;
  const warningCount = stderrLogs.filter((l) => l.status === 'warning').length;

  const filteredLogs = useMemo(() => {
    return stderrLogs.filter((l) => {
      if (activeLogTab === 'errors' && l.status !== 'error') return false;
      if (stderrFilterSearch.trim()) {
        const q = stderrFilterSearch.toLowerCase();
        return (
          l.command.toLowerCase().includes(q) ||
          (l.target && l.target.toLowerCase().includes(q)) ||
          l.stderr.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stderrLogs, activeLogTab, stderrFilterSearch]);

  const rawCombinedStderr = useMemo(
    () =>
      stderrLogs
        .map(
          (l) =>
            `=== [${l.timestamp}] ${l.command} (${l.target || 'target'}) HTTP ${l.httpCode || 0} ===\n${l.stderr}`
        )
        .join('\n\n'),
    [stderrLogs]
  );

  return {
    stderrLogs,
    lastApiStatus,
    autoExpandOnError,
    stderrDrawerOpen,
    drawerHeight,
    activeLogTab,
    stderrFilterSearch,
    copiedStderr,

    errorCount,
    warningCount,
    filteredLogs,
    rawCombinedStderr,

    executeApiCall,
    simulateError,
    clearStderrLogs,
    copyAllStderr,

    setStderrDrawerOpen,
    setAutoExpandOnError,
    setDrawerHeight,
    setActiveLogTab,
    setStderrFilterSearch,
  };
}
