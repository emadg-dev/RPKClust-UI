import React from 'react';
import { Gauge } from 'lucide-react';
import { MetricsSummary } from '../types';

export interface MetricsPipelineViewProps {
  metrics: MetricsSummary;
}

/**
 * Pipeline view showing per-cluster purity and confusion matrix for a
 * single trace with ground-truth labels.
 */
export default function MetricsPipelineView({ metrics }: MetricsPipelineViewProps) {
  if (!metrics.available) {
    return <p className="text-xs text-faint">Metrics unavailable: no ground-truth labels in this capture.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="stat"><span className="label block">Homogeneity</span><span className="text-xl font-bold text-cyan font-mono">{(metrics.homogeneity * 100).toFixed(1)}%</span></div>
        <div className="stat"><span className="label block">Completeness</span><span className="text-xl font-bold text-cyan font-mono">{(metrics.completeness * 100).toFixed(1)}%</span></div>
        <div className="stat"><span className="label block">V-measure</span><span className="text-xl font-bold text-emerald font-mono">{(metrics.v_measure * 100).toFixed(1)}%</span></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-mid mb-1.5 flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-accent3" />Per-cluster purity</h4>
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-panel"><tr className="text-low text-left border-b border-default"><th className="py-1.5 pr-3">Cluster</th><th className="py-1.5 pr-3">Size</th><th className="py-1.5 pr-3">Purity</th><th className="py-1.5">Top label</th></tr></thead>
              <tbody>{metrics.per_cluster.map((c) => (<tr key={c.cluster} className="border-b border-default-wash text-hi"><td className="py-1.5 pr-3 text-cyan-soft">{c.cluster}</td><td className="py-1.5 pr-3">{c.size}</td><td className="py-1.5 pr-3">{(c.purity * 100).toFixed(1)}%</td><td className="py-1.5">{c.top_label ?? '–'}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-mid mb-1.5">Confusion (cluster × label)</h4>
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-panel"><tr className="text-low text-left border-b border-default"><th className="py-1.5 pr-3">Cluster</th><th className="py-1.5 pr-3">Label</th><th className="py-1.5">Count</th></tr></thead>
              <tbody>{metrics.confusion.map((c, i) => (<tr key={i} className="border-b border-default-wash text-hi"><td className="py-1.5 pr-3 text-cyan-soft">{c.cluster}</td><td className="py-1.5 pr-3">{c.label}</td><td className="py-1.5">{c.count}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}