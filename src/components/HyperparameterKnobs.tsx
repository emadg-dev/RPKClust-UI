import React from 'react';
import { RotateCcw, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { Hyperparameters } from '../types';

interface HyperparameterKnobsProps {
  params: Hyperparameters;
  setParams: (params: Hyperparameters) => void;
  onReset: () => void;
  onApply: () => void;
  selectedSource: string;
  selectedDataset: string;
  onRunAllBenchmarks: () => void;
  onLoadDataset: (source: string, dataset: string) => void;
  open: boolean;
  onToggle: () => void;
}

const RULE_NAMES = ['constant', 'sequence', 'timestamp', 'float', 'length', 'checksum', 'address'];
const DETECTORS = ['constant', 'sequence', 'timestamp', 'checksum', 'address', 'float', 'length', 'sparse'];

export default function HyperparameterKnobs({
  params,
  setParams,
  onReset,
  onApply,
  selectedSource,
  selectedDataset,
  onRunAllBenchmarks,
  onLoadDataset,
  open,
  onToggle,
}: HyperparameterKnobsProps) {
  const handleApply = () => {
    onLoadDataset(selectedSource, selectedDataset);
    onRunAllBenchmarks();
  };

  const excludeRules = params.for_exclude_rules ?? RULE_NAMES;

  const toggleExcludeRule = (rule: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...excludeRules, rule]))
      : excludeRules.filter((x) => x !== rule);
    setParams({ ...params, for_exclude_rules: next });
  };

  return (
    <div>
      {/* Side drawer panel */}
      <div
        className={
          'fixed top-[72px] right-0 h-[calc(100vh-72px)] w-[420px] max-w-[92vw] bg-panel border-l border-default shadow-2xl overflow-y-auto transition-transform duration-300 ease-in-out z-[60] ' +
          (open ? 'translate-x-0' : 'translate-x-full')
        }
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-default pb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-hi text-base">Algorithm Hyperparameter Controls</h3>
              <span className="text-xs text-low ml-2">Adjust knobs to re-run probability inference and boundary scanning</span>
            </div>
            <button
              onClick={onToggle}
              className="px-2 py-1 rounded btn-ghost text-mid text-xs font-medium flex items-center gap-1 transition"
              title="Collapse"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 text-xs">
            {/* Candidate Windows & Sparsity */}
            <div className="space-y-3 bg-base p-3.5 rounded border border-default">
              <span className="font-bold text-amber uppercase tracking-wider block">Candidate Windows &amp; Sparsity</span>
              <div>
                <label className="text-mid font-medium block mb-1">Candidate Window Sizes L:</label>
                <div className="flex gap-2">
                  {[1, 2, 4].map((len) => (
                    <button
                      key={len}
                      onClick={() => {
                        const current = params.fo_lengths_for_candidates;
                        const next = current.includes(len)
                          ? current.filter((x) => x !== len)
                          : [...current, len].sort((a, b) => a - b);
                        if (next.length > 0) {
                          setParams({ ...params, fo_lengths_for_candidates: next });
                        }
                      }}
                      className={`px-3 py-1 rounded font-mono font-bold text-xs border ${
                        params.fo_lengths_for_candidates.includes(len)
                          ? 'bg-accent text-hi border-accent2'
                          : 'bg-panel text-faint border-default'
                      }`}
                    >
                      {len}B
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-mid">Sparse Ratio Threshold:</span>
                  <span className="font-mono text-cyan-soft font-bold">{params.sparse_ratio}</span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.08"
                  step="0.005"
                  value={params.sparse_ratio}
                  onChange={(e) => setParams({ ...params, sparse_ratio: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
                <span className="text-[10px] text-faint">Default: 0.02</span>
              </div>
            </div>

            {/* Stage 1 */}
            <div className="space-y-3 bg-base p-3.5 rounded border border-default">
              <span className="font-bold text-cyan uppercase tracking-wider block">Stage 1 Probabilistic Selection</span>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-mid">Stage 1 Top-K Retention:</span>
                  <span className="font-mono text-cyan-soft font-bold">{params.stage1_top_k}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={params.stage1_top_k}
                  onChange={(e) => setParams({ ...params, stage1_top_k: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
                <span className="text-[10px] text-faint">Number of fields passed to Stage 2</span>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-mid">Similarity Sample Size:</span>
                  <span className="font-mono text-cyan-soft font-bold">{params.sim_sample_size}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={params.sim_sample_size}
                  onChange={(e) => setParams({ ...params, sim_sample_size: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-mid">Sample Pairs:</span>
                  <span className="font-mono text-cyan-soft font-bold">{params.sim_sample_pairs ?? 20000}</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="50000"
                  step="1000"
                  value={params.sim_sample_pairs ?? 20000}
                  onChange={(e) => setParams({ ...params, sim_sample_pairs: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-mid">Pair Min Ratio:</span>
                  <span className="font-mono text-cyan-soft font-bold">{params.pair_min_ratio ?? 0.3}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.9"
                  step="0.05"
                  value={params.pair_min_ratio ?? 0.3}
                  onChange={(e) => setParams({ ...params, pair_min_ratio: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>

            {/* Position constraint */}
            <div className="space-y-3 bg-base p-3.5 rounded border border-default">
              <span className="font-bold text-emerald uppercase tracking-wider block">Position Constraint (Stage 2)</span>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-mid">FOR Position Base:</span>
                  <span className="font-mono text-cyan-soft font-bold">{params.pos_for_base}</span>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="0.99"
                  step="0.01"
                  value={params.pos_for_base}
                  onChange={(e) => setParams({ ...params, pos_for_base: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-mid">Position Slope:</span>
                  <span className="font-mono text-cyan-soft font-bold">{params.pos_for_slope}</span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.03"
                  step="0.005"
                  value={params.pos_for_slope}
                  onChange={(e) => setParams({ ...params, pos_for_slope: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
                <span className="text-[10px] text-faint">max(base - slope * off, floor)</span>
              </div>
            </div>

            {/* Active detectors */}
            <div className="space-y-2 bg-base p-3.5 rounded border border-default">
              <span className="font-bold text-purple uppercase tracking-wider block">Active Detectors</span>
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                {DETECTORS.map((det) => (
                  <label key={det} className="flex items-center gap-1.5 text-mid cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.enabled_detectors.includes(det)}
                      onChange={(e) => {
                        const newDets = e.target.checked
                          ? [...params.enabled_detectors, det]
                          : params.enabled_detectors.filter((d) => d !== det);
                        setParams({ ...params, enabled_detectors: newDets });
                      }}
                      className="rounded border-strong text-accent focus:ring-0"
                    />
                    <span className="capitalize">{det}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Boundary + TLV */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3 bg-base p-3.5 rounded border border-default">
                <span className="font-bold text-rose uppercase tracking-wider block">Boundary Detection</span>
                <label className="flex items-center gap-1.5 text-mid cursor-pointer">
                  <input type="checkbox" checked={!!params.boundary_per_direction} onChange={(e) => setParams({ ...params, boundary_per_direction: e.target.checked })} className="rounded border-strong text-accent" />
                  <span>Per-direction</span>
                </label>
                <label className="flex items-center gap-1.5 text-mid cursor-pointer">
                  <input type="checkbox" checked={!!params.boundary_require_contiguous} onChange={(e) => setParams({ ...params, boundary_require_contiguous: e.target.checked })} className="rounded border-strong text-accent" />
                  <span>Require contiguous</span>
                </label>
                <label className="flex items-center gap-1.5 text-mid cursor-pointer">
                  <input type="checkbox" checked={!!params.boundary_include_extra_rules} onChange={(e) => setParams({ ...params, boundary_include_extra_rules: e.target.checked })} className="rounded border-strong text-accent" />
                  <span>Extra rules</span>
                </label>
                <div className="flex justify-between mb-1">
                  <span className="text-mid">Min msgs:</span>
                  <span className="font-mono text-cyan-soft">{params.boundary_min_msgs ?? 20}</span>
                </div>
                <input type="range" min="5" max="100" step="5" value={params.boundary_min_msgs ?? 20} onChange={(e) => setParams({ ...params, boundary_min_msgs: parseInt(e.target.value) })} className="w-full accent-rose-500" />
              </div>
              <div className="space-y-3 bg-base p-3.5 rounded border border-default">
                <span className="font-bold text-violet uppercase tracking-wider block">TLV / NFOR</span>
                <label className="flex items-center gap-1.5 text-mid cursor-pointer">
                  <input type="checkbox" checked={!!params.tlv_auto_params} onChange={(e) => setParams({ ...params, tlv_auto_params: e.target.checked })} className="rounded border-strong text-accent" />
                  <span>Auto params</span>
                </label>
                <div className="flex justify-between mb-1">
                  <span>T len:</span>
                  <span className="font-mono text-cyan-soft">{params.tlv_t_len ?? 1}</span>
                </div>
                <input type="range" min="1" max="4" step="1" value={params.tlv_t_len ?? 1} onChange={(e) => setParams({ ...params, tlv_t_len: parseInt(e.target.value) })} className="w-full accent-violet-500" />
                <div className="flex justify-between mb-1">
                  <span>L len:</span>
                  <span className="font-mono text-cyan-soft">{params.tlv_l_len ?? 1}</span>
                </div>
                <input type="range" min="1" max="4" step="1" value={params.tlv_l_len ?? 1} onChange={(e) => setParams({ ...params, tlv_l_len: parseInt(e.target.value) })} className="w-full accent-violet-500" />
              </div>
            </div>

            {/* FOR exclude rules (this block was missing its wrapper) */}
            <div className="space-y-2 bg-base p-3.5 rounded border border-default">
              <span className="font-bold text-amber uppercase tracking-wider block">FOR Exclude Rules</span>
              <div className="grid grid-cols-2 gap-1.5">
                {RULE_NAMES.map((rule) => (
                  <label key={rule} className="flex items-center gap-1.5 text-mid cursor-pointer">
                    <input
                      type="checkbox"
                      checked={excludeRules.includes(rule)}
                      onChange={(e) => toggleExcludeRule(rule, e.target.checked)}
                      className="rounded border-strong text-accent"
                    />
                    <span className="capitalize">{rule}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Advanced config (read-only) */}
            <div className="space-y-2 bg-base p-3 rounded border border-default">
              <span className="font-bold text-faint uppercase tracking-wider block text-[10px]">Advanced Config (from Config)</span>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span>Checksum Algos:</span> <span className="font-mono">{(params.checksum_algorithms ?? []).join(',').slice(0, 20)}...</span></div>
                <div><span>Timestamp Slack:</span> <span className="font-mono">{params.timestamp_slack_s ?? 86400}s</span></div>
                <div><span>Seq Match Ratio:</span> <span className="font-mono">{params.seq_match_ratio ?? 1.0}</span></div>
                <div><span>Addr Corr:</span> <span className="font-mono">{params.address_corr_threshold ?? -0.8}</span></div>
                <div><span>Norm Range:</span> <span className="font-mono">[{(params.norm_range ?? [0.1, 0.95]).join(',')}]</span></div>
                <div><span>Prob Clip:</span> <span className="font-mono">{params.prob_clip ? '[' + params.prob_clip.join(',') + ']' : 'off'}</span></div>
                <div><span>TLV Endians:</span> <span className="font-mono">{(params.tlv_endians ?? ['big', 'little']).join(',')}</span></div>
                <div><span>TLV T Lens:</span> <span className="font-mono">{(params.tlv_t_lens ?? [1, 2]).join(',')}</span></div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-default">
              <button
                onClick={onReset}
                className="px-3 py-1.5 rounded btn-ghost text-mid text-xs font-medium flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Defaults
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-1.5 rounded btn-primary text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Play className="w-3.5 h-3.5" />
                Apply &amp; Re-evaluate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapse tab / handle on the right edge when drawer is closed */}
      <button
        onClick={onToggle}
        className={
          'fixed top-[72px] right-0 z-[55] flex items-center gap-1 px-2 py-2 bg-panel/90 border border-r-0 border-default rounded-l-lg shadow-lg transition-all duration-300 hover:pr-3 ' +
          (open ? 'translate-x-[400px]' : 'translate-x-0')
        }
        title="Open Hyperparameters"
      >
        <ChevronLeft className="w-4 h-4 text-mid" />
      </button>
    </div>
  );
}