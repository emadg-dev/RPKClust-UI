import React from 'react';
import MetricsTableView from './MetricsTableView';
import MetricsChartView from './MetricsChartView';
import MetricsPipelineView from './MetricsPipelineView';
import { BenchmarkResult, MetricsSummary } from '../types';

export interface ClusteringMetricsViewProps {
  variant: 'table' | 'chart' | 'pipeline';
  benchmarks?: BenchmarkResult[];
  benchLoading?: boolean;
  onReEvaluate?: () => void;
  metrics?: MetricsSummary;
}

export default function ClusteringMetricsView(props: ClusteringMetricsViewProps) {
  switch (props.variant) {
    case 'table':
      return <MetricsTableView benchmarks={props.benchmarks ?? []} benchLoading={props.benchLoading ?? false} onReEvaluate={props.onReEvaluate ?? (() => {})} />;
    case 'chart':
      return <MetricsChartView benchmarks={props.benchmarks ?? []} />;
    case 'pipeline':
      return <MetricsPipelineView metrics={props.metrics ?? { available: false, homogeneity: 0, completeness: 0, v_measure: 0, per_cluster: [], confusion: [] }} />;
    default:
      return null;
  }
}