import React from 'react';
import { RotateCcw, Play, SlidersHorizontal } from 'lucide-react';
import { Hyperparameters } from '../types';

interface HyperparameterKnobsProps {
  params: Hyperparameters;
  setParams: (params: Hyperparameters) => void;
  onReset: () => void;
  onApply: () => void;
  selectedSource: string;
  selectedDataset: string;
  benchmarkFilter: string;
  onRunAllBenchmarks: (filter: string) => void;
  onLoadDataset: (source: string, dataset: string) => void;
}

export default function HyperparameterKnobs({
  params,
  setParams,
  onReset,
  onApply,
  selectedSource,
  selectedDataset,
  benchmarkFilter,
  onRunAllBenchmarks,
  onLoadDataset,
}: HyperparameterKnobsProps) {
  const handleApply = () => {
    onLoadDataset(selectedSource, selectedDataset);
    onRunAllBenchmarks(benchmarkFilter);
  };

  return (
    <div className="bg-panel border-b border-default px-6 py-5">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between border-b border-default pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-hi text-base">Algorithm Hyperparameter Controls &amp; Tuning</h3>
            <span className="text-xs text-low ml-2">Adjust knobs to re-run probability inference and boundary scanning</span>
          </div>
          <div className="flex items-center gap-2">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
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
                        : [...current, len].sort();
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
          </div>

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

          <div className="space-y-2 bg-base p-3.5 rounded border border-default">
            <span className="font-bold text-purple uppercase tracking-wider block">Active Detectors</span>
            <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto pr-1">
              {['constant', 'sequence', 'timestamp', 'checksum', 'address', 'float', 'length', 'sparse'].map((det) => (
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
        </div>
      </div>
    </div>
  );
}
