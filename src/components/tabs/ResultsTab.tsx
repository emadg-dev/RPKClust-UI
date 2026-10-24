import ClusteringMetricsView from '../ClusteringMetricsView';
import BaselineComparisonCard from '../BaselineComparisonCard';
import { ActiveTab } from '../../types';

interface ResultsTabProps {
  benchmarks: any[];
  sourcesCatalog: Record<string, any>;
  benchmarkFilter: string;
  msgCountFilter?: number;
  onRunAllBenchmarks: (filter: string, msgCount?: number) => void;
  onMsgCountChange?: (count: number) => void;
  benchLoading: boolean;
  rpkAvgV: string | null;
  baselines: any[];
  onBenchmarkClick: (sourceId?: string, datasetId?: string) => void;
  onTabChange: (tab: ActiveTab) => void;
}

export default function ResultsTab({
  benchmarks,
  sourcesCatalog,
  benchmarkFilter,
  msgCountFilter,
  onMsgCountChange,
  onRunAllBenchmarks,
  benchLoading,
  rpkAvgV,
  baselines,
  onBenchmarkClick,
  onTabChange,
}: ResultsTabProps) {
  return (
    <div className="space-y-6">
      <ClusteringMetricsView
        variant="table"
        benchmarks={benchmarks}
        benchLoading={benchLoading}
        sourceFilter={benchmarkFilter}
        sourcesCatalog={sourcesCatalog}
        msgCountFilter={msgCountFilter}
        onFilterChange={(f) => onRunAllBenchmarks(f, msgCountFilter)}
        onMsgCountChange={(c) => onMsgCountChange?.(c)}
        onReEvaluate={() => onRunAllBenchmarks(benchmarkFilter, msgCountFilter)}
      />

      <BaselineComparisonCard rpkAvgV={rpkAvgV} baselines={baselines} />
    </div>
  );
}
