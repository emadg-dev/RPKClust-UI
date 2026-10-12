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
        <div key={idx} className="text-rose font-bold bg-rose-dark-wash-40 px-1 rounded my-0.5">
          {line}
        </div>
      );
    }
    if (line.trim().startsWith('File ') && line.includes('line ')) {
      return (
        <div key={idx} className="text-low pl-2">
          {line}
        </div>
      );
    }
    if (line.match(/^[A-Za-z]+Error:|^[A-Za-z]+Exception:/)) {
      return (
        <div key={idx} className="text-rose-soft font-bold bg-rose-dark-wash-50 border-l-2 border-rose2 pl-2 py-0.5 my-1">
          {line}
        </div>
      );
    }
    if (line.includes('[rpkclust.api_runner ERROR]')) {
      return (
        <div key={idx} className="text-amber font-semibold bg-amber-dark-wash-30 px-1 my-0.5">
          {line}
        </div>
      );
    }
    return (
      <div key={idx} className="text-mid">
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
      className="fixed bottom-0 left-0 right-0 z-40 bg-panel border-t border-default flex flex-col transition-all duration-200"
      aria-label="Python API Runner Stderr Console"
    >
      <div
        onClick={() => setStderrDrawerOpen(!stderrDrawerOpen)}
        className="h-11 px-4 bg-panel hover-bg-inset cursor-pointer flex items-center justify-between border-b border-default select-none transition"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center ${
                errorCount > 0
                  ? 'bg-rose-wash text-rose border border-rose-wash-30'
                  : warningCount > 0
                  ? 'bg-amber-wash text-amber border border-amber-wash-30'
                  : 'bg-inset text-cyan border border-strong'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-xs text-hi tracking-wide flex items-center gap-2">
              Python API Runner Console & Stderr
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            {errorCount > 0 ? (
              <span className="badge font-bold bg-rose-wash text-rose-soft border border-rose-wash-30 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose" />
                {errorCount} Error{errorCount > 1 ? 's' : ''}
              </span>
            ) : warningCount > 0 ? (
              <span className="badge font-bold bg-amber-wash text-amber-soft border border-amber-wash-30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber" />
                {warningCount} Warning{warningCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="badge font-medium bg-emerald-wash-10 text-emerald border border-emerald-wash-20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald" />
                Clean Stderr
              </span>
            )}

            {lastApiStatus && (
              <span className="hidden sm:inline-flex text-low items-center gap-1">
                • Last: <strong className="text-hi">{lastApiStatus.command}</strong>
                {lastApiStatus.target ? ` (${lastApiStatus.target})` : ''} • {lastApiStatus.durationMs}ms
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
          <label className="hidden md:flex items-center gap-1.5 text-[11px] text-low hover-text-hi cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={api.autoExpandOnError}
              onChange={(e) => api.setAutoExpandOnError(e.target.checked)}
              className="rounded border-strong bg-inset text-accent2 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Auto-expand on error</span>
          </label>

          <button
            onClick={simulateError}
            title="Trigger a simulated Python exception to test the stderr drawer"
            className="px-2.5 py-1 rounded bg-rose-dark-wash-40 hover-bg-rose-abyss-wash-60 border border-rose-strong-wash text-rose-soft text-[11px] font-semibold flex items-center gap-1 transition"
          >
            <Bug className="w-3 h-3 text-rose" />
            <span>Simulate Error</span>
          </button>

          {stderrLogs.length > 0 && (
            <button
              onClick={copyAllStderr}
              className="px-2.5 py-1 rounded btn-ghost border border-strong text-mid text-[11px] font-medium flex items-center gap-1 transition"
              title="Copy all stderr logs to clipboard"
            >
              {copiedStderr ? <Check className="w-3 h-3 text-emerald" /> : <Copy className="w-3 h-3" />}
              <span>{copiedStderr ? 'Copied' : 'Copy Stderr'}</span>
            </button>
          )}

          {stderrLogs.length > 0 && (
            <button
              onClick={clearStderrLogs}
              className="p-1 rounded hover-bg-inset text-low hover-text-hi transition"
              title="Clear stderr logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {stderrDrawerOpen && (
            <div className="hidden sm:flex items-center gap-1 border-l border-default pl-2">
              <button
                onClick={() => setDrawerHeight('compact')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  drawerHeight === 'compact'
                    ? 'bg-accent text-hi'
                    : 'text-low hover-text-hi'
                }`}
                title="Compact drawer height (200px)"
              >
                S
              </button>
              <button
                onClick={() => setDrawerHeight('medium')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  drawerHeight === 'medium'
                    ? 'bg-accent text-hi'
                    : 'text-low hover-text-hi'
                }`}
                title="Medium drawer height (340px)"
              >
                M
              </button>
              <button
                onClick={() => setDrawerHeight('large')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  drawerHeight === 'large'
                    ? 'bg-accent text-hi'
                    : 'text-low hover-text-hi'
                }`}
                title="Large drawer height (480px)"
              >
                L
              </button>
            </div>
          )}

          <button
            onClick={() => setStderrDrawerOpen(!stderrDrawerOpen)}
            className="p-1 rounded hover-bg-inset text-mid hover:text-hi transition"
            title={stderrDrawerOpen ? 'Collapse Stderr Drawer' : 'Expand Stderr Drawer'}
          >
            {stderrDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {stderrDrawerOpen && (
        <div
          className={`bg-base flex flex-col font-mono text-xs overflow-hidden transition-all duration-200 ${heightClass}`}
        >
          <div className="bg-panel border-b border-default px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveLogTab('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  activeLogTab === 'all'
                    ? 'bg-accent text-hi'
                    : 'text-low hover-text-hi hover-bg-inset'
                }`}
              >
                All Logs ({stderrLogs.length})
              </button>
              <button
                onClick={() => setActiveLogTab('errors')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition flex items-center gap-1.5 ${
                  activeLogTab === 'errors'
                    ? 'bg-rose-strong text-hi'
                    : 'text-low hover-text-hi hover-bg-inset'
                }`}
              >
                <AlertCircle className="w-3 h-3 text-rose" />
                <span>Errors Only ({errorCount})</span>
              </button>
              <button
                onClick={() => setActiveLogTab('raw')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  activeLogTab === 'raw'
                    ? 'bg-accent text-hi'
                    : 'text-low hover-text-hi hover-bg-inset'
                }`}
              >
                Raw Stderr Stream
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-faint absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={stderrFilterSearch}
                onChange={(e) => setStderrFilterSearch(e.target.value)}
                placeholder="Filter stderr logs..."
                className="bg-base border border-default rounded-md pl-8 pr-3 py-1 text-[11px] text-hi placeholder:text-fainter focus:outline-none focus-border-strong w-48"
              />
              {stderrFilterSearch && (
                <button
                  onClick={() => setStderrFilterSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover-text-mid text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs select-text">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-3 text-faint">
                <div className="w-10 h-10 rounded-full bg-panel border border-default flex items-center justify-center text-fainter">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-low">No Stderr Output Recorded</p>
                  <p className="text-[11px] text-faint max-w-sm mt-0.5">
                    The Python runner processes are executing without stderr warnings or errors. If a protocol fails
                    or Python emits tracebacks, they will appear here in real-time.
                  </p>
                </div>
                <button
                  onClick={simulateError}
                  className="px-3 py-1.5 rounded bg-panel hover-bg-inset border border-default text-xs text-rose-soft font-semibold flex items-center gap-1.5 transition"
                >
                  <Bug className="w-3.5 h-3.5 text-rose" />
                  Trigger Simulated Test Error
                </button>
              </div>
            ) : activeLogTab === 'raw' ? (
              <pre className="text-mid whitespace-pre-wrap leading-relaxed select-text bg-base p-3 rounded border border-dark">
                {rawCombinedStderr}
              </pre>
            ) : (
              filteredLogs.map((log) => {
                const isErr = log.status === 'error';
                return (
                  <div
                    key={log.id}
                    className={`rounded border p-3.5 transition ${
                      isErr
                        ? 'bg-rose-dark-wash-20 border-rose-abyss-wash-50'
                        : 'bg-panel-wash-50 border-default'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-default">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`badge text-[10px] font-bold ${
                            isErr
                              ? 'bg-rose-wash text-rose-soft border border-rose-wash-30'
                              : 'bg-amber-wash text-amber-soft border border-amber-wash-30'
                          }`}
                        >
                          {isErr ? 'ERROR' : 'WARNING'}
                        </span>
                        <span className="font-bold text-hi text-[11px]">{log.command}</span>
                        {log.target && <span className="text-cyan text-[11px]">({log.target})</span>}
                        <span className="text-faint text-[10px]">
                          HTTP {log.httpCode || 0} • {log.durationMs || 0}ms
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-faint text-[10px]">{log.timestamp}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(log.stderr);
                          }}
                          className="p-1 rounded hover-bg-inset text-low hover-text-hi transition"
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
