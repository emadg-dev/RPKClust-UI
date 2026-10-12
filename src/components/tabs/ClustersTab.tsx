import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Boxes,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  ApiCallResult,
  ClusterGroup,
  ClusterMessage,
  ClusterMessagesResponse,
  Hyperparameters,
} from '../../types';

interface ClustersTabProps {
  executeApiCall: (payload: unknown, label?: string) => Promise<ApiCallResult>;
  sourceId: string;
  datasetId: string;
  maxMessages: number;
  params: Hyperparameters;
  datasetName?: string;
  protocolName?: string;
}

function formatHex(hex: string): string {
  return hex.replace(/(..)/g, '$1 ').trim();
}

export default function ClustersTab({
  executeApiCall,
  sourceId,
  datasetId,
  maxMessages,
  params,
  datasetName,
  protocolName,
}: ClustersTabProps) {
  const [data, setData] = useState<ClusterMessagesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');

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

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { ok, data: res } = await executeApiCall(
        {
          cmd: 'cluster_messages',
          source_id: sourceId,
          dataset_id: datasetId,
          max_messages: maxMessages,
          config: serialized,
        },
        `${sourceId}/${datasetId}/clusters`
      );
      if (ok && res?.status === 'ok') {
        const typed = res as ClusterMessagesResponse;
        setData(typed);
        setExpanded(typed.clusters[0]?.key ?? null);
      } else {
        setError(res?.message || 'Failed to load clustered messages');
        setData(null);
        setExpanded(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, datasetId, maxMessages]);

  const messagesByCluster = useMemo(() => {
    const map = new Map<string, ClusterMessage[]>();
    for (const m of data?.messages ?? []) {
      const list = map.get(m.cluster);
      if (list) list.push(m);
      else map.set(m.cluster, [m]);
    }
    return map;
  }, [data]);

  const q = filter.trim().toLowerCase();

  const matches = (m: ClusterMessage): boolean =>
    m.hex.toLowerCase().includes(q) ||
    (m.label ?? '').toLowerCase().includes(q) ||
    String(m.id).includes(q);

  const visibleClusters = useMemo(() => {
    if (!data) return [] as ClusterGroup[];
    if (!q) return data.clusters;
    return data.clusters.filter((g) => {
      if (g.key.toLowerCase().includes(q)) return true;
      return (messagesByCluster.get(g.key) ?? []).some(matches);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q, messagesByCluster]);

  const c2sKw = data?.keyword?.['c2s'] ?? data?.keyword?.['both'];
  const labeledCount = useMemo(
    () => (data?.messages ?? []).filter((m) => m.label != null).length,
    [data]
  );

  return (
    <div className="space-y-6">
      <div className="panel p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-hi text-lg flex items-center gap-2">
            <Boxes className="w-5 h-5 text-accent3" />
            Clustered Messages
          </h2>
          <p className="text-xs text-low mt-0.5">
            Messages grouped by inferred keyword cluster — {sourceId}/{datasetId}
            {datasetName ? ` (${datasetName})` : ''}
            {protocolName ? ` · ${protocolName}` : ''} · max {maxMessages} msgs
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 btn-primary disabled:opacity-50 text-hi text-xs font-semibold rounded flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Clustering…' : 'Re-run Clustering'}
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="stat p-4 animate-pulse">
              <div className="h-3 bg-inset rounded w-20 mb-2" />
              <div className="h-6 bg-inset rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="panel p-5 border-rose-wash-40 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-rose text-sm">Clustering failed</h3>
            <p className="text-xs text-rose-soft mt-1 font-mono whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat p-4">
              <span className="label block">Total Messages</span>
              <span className="text-xl font-bold text-cyan font-mono">
                {data.total_messages}
              </span>
            </div>
            <div className="stat p-4">
              <span className="label block">Clusters</span>
              <span className="text-xl font-bold text-hi font-mono">
                {data.clusters.length}
              </span>
            </div>
            <div className="stat p-4">
              <span className="label block">Inferred Keyword (c2s)</span>
              <span className="text-xl font-bold text-cyan font-mono">
                {c2sKw ? `Off ${c2sKw.offset} · Len ${c2sKw.length}` : '–'}
              </span>
            </div>
            <div className="stat p-4">
              <span className="label block">Ground-Truth Labeled</span>
              <span className="text-xl font-bold text-amber font-mono">
                {labeledCount}
              </span>
            </div>
          </div>

          <div className="panel p-3 flex items-center gap-3">
            <Search className="w-4 h-4 text-low shrink-0" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by cluster key, hex bytes, label, or message id…"
              className="flex-1 bg-transparent text-xs text-hi placeholder:text-faint outline-none"
            />
            {filter && (
              <button
                onClick={() => setFilter('')}
                className="text-xs text-low hover-text-hi px-1"
              >
                ✕
              </button>
            )}
          </div>

          <div className="space-y-3">
            {visibleClusters.length === 0 && (
              <div className="panel p-8 text-center text-xs text-low">
                No clusters match the current filter.
              </div>
            )}
            {visibleClusters.map((g) => {
              const isOpen = expanded === g.key;
              const msgs = isOpen
                ? q
                  ? (messagesByCluster.get(g.key) ?? []).filter(matches)
                  : messagesByCluster.get(g.key) ?? []
                : [];
              const topLabels = Object.entries(g.labels)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
              const purity =
                g.size > 0 && topLabels.length > 0
                  ? ((topLabels[0][1] / g.size) * 100).toFixed(0)
                  : null;

              return (
                <div key={g.key} className="panel overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : g.key)}
                    className="w-full px-5 py-4 flex items-center gap-3 hover-bg-inset transition text-left"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-low shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-low shrink-0" />
                    )}
                    <span className="font-mono font-bold text-cyan text-sm">
                      {g.key}
                    </span>
                    <span className="badge font-bold bg-accent2-wash text-accent-soft border border-accent2-wash-30">
                      {g.size} msgs
                    </span>
                    <span className="text-[11px] text-low font-mono">
                      c2s {g.c2s} · s2c {g.s2c}
                    </span>
                    {topLabels.length > 0 && (
                      <span className="text-[11px] text-amber font-mono">
                        labels: {topLabels.map(([l, c]) => `${l}×${c}`).join(', ')}
                        {purity ? ` (${purity}% pure)` : ''}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-faint uppercase tracking-wider">
                      {isOpen ? 'collapse' : 'expand'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-default overflow-x-auto">
                      {msgs.length === 0 ? (
                        <p className="px-5 py-4 text-xs text-low">
                          No messages in this cluster match the filter.
                        </p>
                      ) : (
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-inset text-low uppercase text-[10px] font-semibold">
                            <tr>
                              <th className="px-5 py-2">Id</th>
                              <th className="px-5 py-2">Dir</th>
                              <th className="px-5 py-2">Len</th>
                              <th className="px-5 py-2">Session</th>
                              <th className="px-5 py-2">Paired</th>
                              <th className="px-5 py-2">Hex</th>
                              <th className="px-5 py-2">Label</th>
                            </tr>
                          </thead>
                          <tbody>
                            {msgs.map((m) => (
                              <tr
                                key={m.id}
                                className="border-b border-default-wash align-top hover-bg-inset transition"
                              >
                                <td className="px-5 py-2 text-low">#{m.id}</td>
                                <td className="px-5 py-2">
                                  <span
                                    className={`badge font-semibold ${
                                      m.direction === 'c2s'
                                        ? 'bg-sky-wash text-sky-soft'
                                        : 'bg-emerald-wash text-emerald-soft'
                                    }`}
                                  >
                                    {m.direction}
                                  </span>
                                </td>
                                <td className="px-5 py-2 text-mid">{m.length}B</td>
                                <td className="px-5 py-2 text-low">
                                  {m.session_id ?? '–'}
                                </td>
                                <td className="px-5 py-2 text-low">
                                  {m.paired_id != null ? `#${m.paired_id}` : '–'}
                                </td>
                                <td className="px-5 py-2 text-hi break-all leading-relaxed">
                                  {formatHex(m.hex)}
                                </td>
                                <td className="px-5 py-2">
                                  {m.label != null ? (
                                    <span className="badge font-semibold bg-amber-wash text-amber-soft">
                                      {m.label}
                                    </span>
                                  ) : (
                                    <span className="text-faint">–</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
