import React from 'react';
import {
  Terminal,
  Bug,
  Copy,
  Check,
  Trash2,
  Search,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import { UseApiCallReturn } from '../hooks/useApiCall';

interface StderrDrawerProps {
  api: UseApiCallReturn;
}

function renderFormattedStderr(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    if (line.startsWith('Traceback (most recent call last):')) {
      return (
        <div key={idx} className="text-rose-400 font-bold bg-rose-950/40 px-1 rounded my-0.5">
          {line}
        </div>
      );
    }
    if (line.trim().startsWith('File ') && line.includes('line ')) {
      return (
        <div key={idx} className="text-slate-400 pl-2">
          {line}
        </div>
      );
    }
    if (line.match(/^[A-Za-z]+Error:|^[A-Za-z]+Exception:/)) {
      return (
        <div key={idx} className="text-rose-300 font-bold bg-rose-950/50 border-l-2 border-rose-500 pl-2 py-0.5 my-1">
          {line}
        </div>
      );
    }
    if (line.includes('[rpkclust.api_runner ERROR]')) {
      return (
        <div key={idx} className="text-amber-400 font-semibold bg-amber-950/30 px-1 my-0.5">
          {line}
        </div>
      );
    }
    return (
      <div key={idx} className="text-slate-300">
        {line}
      </div>
    );
  });
}

export default function StderrDrawer({ api }: StderrDrawerProps) {
  const {
    stderrLogs,
    filteredLogs,
    errorCount,
    warningCount,
    rawCombinedStderr,
    activeLogTab,
    stderrDrawerOpen,
    drawerHeight,
    stderrFilterSearch,
    copiedStderr,
    lastApiStatus,
    setStderrDrawerOpen,
    setDrawerHeight,
    setActiveLogTab,
    setStderrFilterSearch,
    clearStderrLogs,
    copyAllStderr,
    simulateError,
  } = api;

  const heightClass =
    drawerHeight === 'compact'
      ? 'h-52'
      : drawerHeight === 'large'
      ? 'h-[480px]'
      : 'h-80';

  return (
    <aside
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 shadow-[0_-10px_35px_rgba(0,0,0,0.6)] flex flex-col transition-all duration-200"
      aria-label="Python API Runner Stderr Console"
    >
      <div
        onClick={() => setStderrDrawerOpen(!stderrDrawerOpen)}
        className="h-11 px-4 bg-slate-900/95 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between border-b border-slate-800/80 select-none transition"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center ${
                errorCount > 0
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : warningCount > 0
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-cyan-400 border border-slate-700'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-xs text-white tracking-wide flex items-center gap-2">
              Python API Runner Console & Stderr
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            {errorCount > 0 ? (
              <span className="px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                {errorCount} Error{errorCount > 1 ? 's' : ''}
              </span>
            ) : warningCount > 0 ? (
              <span className="px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {warningCount} Warning{warningCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Clean Stderr
              </span>
            )}

            {lastApiStatus && (
              <span className="hidden sm:inline-flex text-slate-400 items-center gap-1">
                • Last: <strong className="text-slate-200">{lastApiStatus.command}</strong>
                {lastApiStatus.target ? ` (${lastApiStatus.target})` : ''} • {lastApiStatus.durationMs}ms
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
          <label className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={api.autoExpandOnError}
              onChange={(e) => api.setAutoExpandOnError(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Auto-expand on error</span>
          </label>

          <button
            onClick={simulateError}
            title="Trigger a simulated Python exception to test the stderr drawer"
            className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-[11px] font-semibold flex items-center gap-1 transition"
          >
            <Bug className="w-3 h-3 text-rose-400" />
            <span>Simulate Error</span>
          </button>

          {stderrLogs.length > 0 && (
            <button
              onClick={copyAllStderr}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition"
              title="Copy all stderr logs to clipboard"
            >
              {copiedStderr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedStderr ? 'Copied' : 'Copy Stderr'}</span>
            </button>
          )}

          {stderrLogs.length > 0 && (
            <button
              onClick={clearStderrLogs}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Clear stderr logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {stderrDrawerOpen && (
            <div className="hidden sm:flex items-center gap-1 border-l border-slate-800 pl-2">
              <button
                onClick={() => setDrawerHeight('compact')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  drawerHeight === 'compact'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Compact drawer height (200px)"
              >
                S
              </button>
              <button
                onClick={() => setDrawerHeight('medium')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  drawerHeight === 'medium'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Medium drawer height (340px)"
              >
                M
              </button>
              <button
                onClick={() => setDrawerHeight('large')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  drawerHeight === 'large'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Large drawer height (480px)"
              >
                L
              </button>
            </div>
          )}

          <button
            onClick={() => setStderrDrawerOpen(!stderrDrawerOpen)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title={stderrDrawerOpen ? 'Collapse Stderr Drawer' : 'Expand Stderr Drawer'}
          >
            {stderrDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {stderrDrawerOpen && (
        <div
          className={`bg-slate-950 flex flex-col font-mono text-xs overflow-hidden transition-all duration-200 ${heightClass}`}
        >
          <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveLogTab('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  activeLogTab === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                All Logs ({stderrLogs.length})
              </button>
              <button
                onClick={() => setActiveLogTab('errors')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition flex items-center gap-1.5 ${
                  activeLogTab === 'errors'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span>Errors Only ({errorCount})</span>
              </button>
              <button
                onClick={() => setActiveLogTab('raw')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  activeLogTab === 'raw'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Raw Stderr Stream
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={stderrFilterSearch}
                onChange={(e) => setStderrFilterSearch(e.target.value)}
                placeholder="Filter stderr logs..."
                className="bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-700 w-48"
              />
              {stderrFilterSearch && (
                <button
                  onClick={() => setStderrFilterSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs select-text">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-3 text-slate-500">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-400">No Stderr Output Recorded</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                    The Python runner processes are executing without stderr warnings or errors. If a protocol fails
                    or Python emits tracebacks, they will appear here in real-time.
                  </p>
                </div>
                <button
                  onClick={simulateError}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-rose-300 font-semibold flex items-center gap-1.5 transition"
                >
                  <Bug className="w-3.5 h-3.5 text-rose-400" />
                  Trigger Simulated Test Error
                </button>
              </div>
            ) : activeLogTab === 'raw' ? (
              <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed select-text bg-slate-950 p-3 rounded-lg border border-slate-900">
                {rawCombinedStderr}
              </pre>
            ) : (
              filteredLogs.map((log) => {
                const isErr = log.status === 'error';
                return (
                  <div
                    key={log.id}
                    className={`rounded-xl border p-3.5 transition ${
                      isErr
                        ? 'bg-rose-950/20 border-rose-900/50 shadow-sm'
                        : 'bg-slate-900/50 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isErr
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {isErr ? 'ERROR' : 'WARNING'}
                        </span>
                        <span className="font-bold text-white text-[11px]">{log.command}</span>
                        {log.target && <span className="text-cyan-400 text-[11px]">({log.target})</span>}
                        <span className="text-slate-500 text-[10px]">
                          HTTP {log.httpCode || 0} • {log.durationMs || 0}ms
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(log.stderr);
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                          title="Copy this error stderr"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <pre className="text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto select-text font-mono">
                      {renderFormattedStderr(log.stderr)}
                    </pre>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
