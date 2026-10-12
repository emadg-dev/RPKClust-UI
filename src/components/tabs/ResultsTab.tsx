import React from 'react';
import BoundaryDisplay from '../BoundaryDisplay';
import ClusteringMetricsView from '../ClusteringMetricsView';
import BaselineComparisonCard from '../BaselineComparisonCard';
import { BenchmarkResult, SourceMeta, BaselineComparison, ActiveTab } from '../../types';

interface ResultsTabProps {
  displayedBenchmarks: BenchmarkResult[];
  sourcesCatalog: Record<string, SourceMeta>;
  benchmarkFilter: string;
  onRunAllBenchmarks: (filter: string) => void;
  benchLoading: boolean;
  rpkAvgV: string | null;
  baselines: BaselineComparison[];
  onBenchmarkClick: (sourceId?: string, datasetId?: string) => void;
  onTabChange: (tab: ActiveTab) => void;
}

export default function ResultsTab({
  displayedBenchmarks,
  sourcesCatalog,
  benchmarkFilter,
  onRunAllBenchmarks,
  benchLoading,
  rpkAvgV,
  baselines,
  onBenchmarkClick,
  onTabChange,
}: ResultsTabProps) {
  return (
    <div className="space-y-6">
      <BoundaryDisplay
        variant="benchmark"
        benchmarks={displayedBenchmarks}
        sourcesCatalog={sourcesCatalog}
        benchmarkFilter={benchmarkFilter}
        onRunAllBenchmarks={onRunAllBenchmarks}
        onBenchmarkClick={onBenchmarkClick}
        onTabChange={onTabChange}
      />

      <ClusteringMetricsView
        variant="table"
        benchmarks={displayedBenchmarks}
        benchLoading={benchLoading}
        onReEvaluate={() => onRunAllBenchmarks(benchmarkFilter)}
      />

      <BaselineComparisonCard rpkAvgV={rpkAvgV} baselines={baselines} />
    </div>
  );
}
