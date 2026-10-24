import ClusteringMetricsView from '../ClusteringMetricsView';
import BaselineComparisonCard from '../BaselineComparisonCard';
import { ActiveTab } from '../../types';

interface ResultsTabProps {
  benchmarks: any[];
  rpkAvgV: string | null;
  baselines: any[];
  benchLoading: boolean;
  onBenchmarkClick: (sourceId?: string, datasetId?: string) => void;
  onReEvaluate: () => void;
}

export default function ResultsTab({
  benchmarks,
  rpkAvgV,
  baselines,
  benchLoading,
  onReEvaluate,
}: ResultsTabProps) {
  return (
    <div className="space-y-6">
      <ClusteringMetricsView
        variant="table"
        benchmarks={benchmarks}
        benchLoading={benchLoading}
        onReEvaluate={onReEvaluate}
      />

      <BaselineComparisonCard rpkAvgV={rpkAvgV} baselines={baselines} />
    </div>
  );
}
