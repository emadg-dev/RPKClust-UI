import React, { useState, useEffect, useMemo } from 'react';
import { ActiveTab, DatasetMeta, ProtocolDetails, BenchmarkResult, SourceMeta, Hyperparameters, SampleMessage } from './types';
import { DEFAULT_PARAMS, DEFAULT_SOURCES, BASELINE_COMPARISONS, FIG1_HEX } from './constants';
import { useApiCall } from './hooks/useApiCall';
import Header from './components/Header';
import HyperparameterKnobs from './components/HyperparameterKnobs';
import DatasetProvenance from './components/DatasetProvenance';
import StderrDrawer from './components/StderrDrawer';
import ResultsTab from './components/tabs/ResultsTab';
import InspectorTab from './components/tabs/InspectorTab';
import CustomTraceTab from './components/tabs/CustomTraceTab';
import PipelineTab from './components/tabs/PipelineTab';
import ClustersTab from './components/tabs/ClustersTab';
import CandidateRankingView from './components/CandidateRankingView';
import ClusteringMetricsView from './components/ClusteringMetricsView';


import { PairwiseInspector } from './components/PairwiseInspector';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('results');
  const [sourcesCatalog, setSourcesCatalog] = useState<Record<string, SourceMeta>>(DEFAULT_SOURCES);
  const [selectedSource, setSelectedSource] = useState<string>('netplier');
  const [selectedDataset, setSelectedDataset] = useState<string>('modbus');
  const [selectedMsgCount, setSelectedMsgCount] = useState<number>(100);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [benchLoading, setBenchLoading] = useState<boolean>(false);
  const [benchProgress, setBenchProgress] = useState<number>(0);
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>([]);
  const [protoDetails, setProtoDetails] = useState<ProtocolDetails | null>(null);
  const [customText, setCustomText] = useState<string>(FIG1_HEX);
  const [customDetails, setCustomDetails] = useState<ProtocolDetails | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<number>(0);
  const [params, setParams] = useState<Hyperparameters>(DEFAULT_PARAMS);
  const [showKnobs, setShowKnobs] = useState<boolean>(false);

  const api = useApiCall();

  const serializeParams = () => ({
    fo_lengths_for_candidates: params.fo_lengths_for_candidates,
    sparse_ratio: params.sparse_ratio,
    stage1_top_k: params.stage1_top_k,
    sim_sample_size: params.sim_sample_size,
    pos_for: [params.pos_for_base, params.pos_for_slope, params.pos_for_floor],
    pos_nfor: params.pos_nfor,
    bituse_endian: params.bituse_endian,
    dmax_mode: params.dmax_mode,
    for_exclude_rules: params.for_exclude_rules ?? params.enabled_detectors.filter((d) => d !== 'sparse'),
    sim_sample_pairs: params.sim_sample_pairs,
    pair_min_ratio: params.pair_min_ratio,
    candidate_max_distinct_ratio: params.candidate_max_distinct_ratio,
    tlv_auto_params: params.tlv_auto_params,
    tlv_t_len: params.tlv_t_len,
    tlv_l_len: params.tlv_l_len,
    tlv_endian: params.tlv_endian,
    tlv_t_lens: params.tlv_t_lens,
    tlv_l_lens: params.tlv_l_lens,
    tlv_endians: params.tlv_endians,
    tlv_min_repeats: params.tlv_min_repeats,
    tlv_min_coverage: params.tlv_min_coverage,
    tlv_min_presence: params.tlv_min_presence,
    tlv_max_type_cardinality: params.tlv_max_type_cardinality,
    const_max_len: params.const_max_len,
    seq_match_ratio: params.seq_match_ratio,
    timestamp_slack_s: params.timestamp_slack_s,
    address_corr_threshold: params.address_corr_threshold,
    checksum_algorithms: params.checksum_algorithms,
    float_min_distinct: params.float_min_distinct,
    enable_float: params.enable_float,
    enable_length: params.enable_length,
    boundary_per_direction: params.boundary_per_direction,
    boundary_require_contiguous: params.boundary_require_contiguous,
    boundary_min_msgs: params.boundary_min_msgs,
    boundary_include_extra_rules: params.boundary_include_extra_rules,
    stage1_normalize: params.stage1_normalize,
    norm_range: params.norm_range,
    struct_mode: params.struct_mode,
    predicate_mode: params.predicate_mode,
    prob_clip: params.prob_clip,
    cluster_label_mode: params.cluster_label_mode,
    seed: params.seed,
    session_gap_s: params.session_gap_s,
    direction_mode: params.direction_mode,
    max_candidates: params.max_candidates,
  });

  const fetchSources = async () => {
    const { data } = await api.executeApiCall({ cmd: 'get_sources' }, 'sources_catalog');
    if (data?.status === 'ok' && data.catalog) {
      setSourcesCatalog(data.catalog);
    }
  };

  const runAllBenchmarks = async (msgCount?: number) => {
    setBenchLoading(true);
    try {
      const { data } = await api.executeApiCall({
        cmd: 'benchmark_all',
        source_id: selectedSource === 'all' ? 'all' : selectedSource,
        msg_count: msgCount,
        config: serializeParams(),
      }, `bench_${selectedSource}`);
      if (data?.status === 'ok') {
        setBenchmarks(data.benchmarks);
      }
    } finally {
      setBenchLoading(false);
    }
  };

  const loadDataset = async (sourceId: string, datasetId: string) => {
    setLoading(true);
    try {
      const { data } = await api.executeApiCall({
        cmd: 'run_dataset',
        source_id: sourceId,
        dataset_id: datasetId,
        config: serializeParams(),
      }, `${sourceId}/${datasetId}`);
      if (data?.status === 'ok') {
        setProtoDetails(data);
        setSelectedMessage(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const runCustomTrace = async () => {
    setLoading(true);
    try {
      const { data } = await api.executeApiCall({
        cmd: 'run_custom',
        text: customText,
        config: serializeParams(),
      }, 'custom_trace');
      if (data?.status === 'ok') {
        setCustomDetails(data);
        setSelectedMessage(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetParams = () => {
    setParams(DEFAULT_PARAMS);
  };

  const handleBenchmarkClick = (sourceId?: string, datasetId?: string) => {
    if (sourceId) setSelectedSource(sourceId);
    if (datasetId) setSelectedDataset(datasetId);
    setActiveTab('inspector');
  };

  useEffect(() => {
    fetchSources();
    runAllBenchmarks();
  }, []);

  useEffect(() => {
    runAllBenchmarks(selectedMsgCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSource]);

  useEffect(() => {
    const curSource = sourcesCatalog[selectedSource] || DEFAULT_SOURCES[selectedSource];
    if (curSource && curSource.datasets.length > 0) {
      const filteredDatasets = curSource.datasets.filter((d) => {
        if (selectedSource === 'binaryinferno') {
          return d.packets === selectedMsgCount;
        }
        return true;
      });
      const exists = filteredDatasets.some((d) => d.id === selectedDataset);
      if (!exists) {
        setSelectedDataset(filteredDatasets[0]?.id || curSource.datasets[0].id);
      } else {
        loadDataset(selectedSource, selectedDataset);
      }
    }
  }, [selectedSource, selectedMsgCount]);

  useEffect(() => {
    if (selectedSource === 'binaryinferno') {
      runAllBenchmarks(selectedMsgCount);
    }
  }, [selectedMsgCount]);

  useEffect(() => {
    loadDataset(selectedSource, selectedDataset);
  }, [selectedDataset]);

  // Benchmark progress animation
  useEffect(() => {
    if (benchLoading) {
      let p = 0;
      const timer = setInterval(() => {
        p += Math.random() * 15 + 5;
        if (p >= 95) p = 95;
        setBenchProgress(Math.round(p));
      }, 400);
      return () => clearInterval(timer);
    } else {
      setBenchProgress(100);
      setTimeout(() => setBenchProgress(0), 800);
    }
  }, [benchLoading]);

  const currentSource = sourcesCatalog[selectedSource] || DEFAULT_SOURCES[selectedSource] || DEFAULT_SOURCES['netplier'];
  const availableDatasets = currentSource?.datasets || [];
  const currentDatasetMeta = availableDatasets.find((d) => d.id === selectedDataset) || availableDatasets[0];

  const currentDetails = activeTab === 'custom' ? customDetails : protoDetails;
  const boundaryB = currentDetails?.boundary?.B ?? 0;
  const messages = (currentDetails?.sample_messages ?? []) as SampleMessage[];
  const topCandidate =
    currentDetails?.keywords?.['c2s']?.ranking?.[0] ??
    currentDetails?.keywords?.['both']?.ranking?.[0] ??
    null;

  const rpkAvgV = useMemo(() => {
    const netplerResults = benchmarks.filter((b) => !b.error && b.v_measure !== undefined);
    if (netplerResults.length === 0) return null;
    const avg = netplerResults.reduce((sum, b) => sum + (b.v_measure || 0), 0) / netplerResults.length;
    return `${(avg * 100).toFixed(1)}%`;
  }, [benchmarks]);

  return (
    <div className="min-h-screen bg-base text-hi flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sourcesCatalog={sourcesCatalog}
        selectedSource={selectedSource}
        setSelectedSource={setSelectedSource}
        sourceDropdownOpen={sourceDropdownOpen}
        setSourceDropdownOpen={setSourceDropdownOpen}
        currentSource={currentSource}
        showKnobs={showKnobs}
        setShowKnobs={setShowKnobs}
        onReRunBenchmarks={runAllBenchmarks}
        benchLoading={benchLoading}
        benchProgress={benchProgress}
        pipelineStage={benchLoading ? 'benchmark_all (BinaryInferno)' : undefined}
      />

      <HyperparameterKnobs
        params={params}
        setParams={setParams}
        onReset={resetParams}
        onApply={() => {
          loadDataset(selectedSource, selectedDataset);
          runAllBenchmarks();
        }}
        selectedSource={selectedSource}
        selectedDataset={selectedDataset}
        onRunAllBenchmarks={runAllBenchmarks}
        onLoadDataset={loadDataset}
        open={showKnobs}
        onToggle={() => setShowKnobs(!showKnobs)}
      />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 pb-28">
        {(
          <DatasetProvenance
            currentSource={currentSource}
            sourcesCatalog={sourcesCatalog}
            selectedSource={selectedSource}
            setSelectedSource={setSelectedSource}
            selectedMsgCount={selectedMsgCount}
            setSelectedMsgCount={setSelectedMsgCount}
            availableDatasets={availableDatasets}
            selectedDataset={selectedDataset}
            setSelectedDataset={setSelectedDataset}
            currentDatasetMeta={currentDatasetMeta}
          />
        )}

        {activeTab === 'results' && (
          <ResultsTab
            benchmarks={benchmarks}
            benchLoading={benchLoading}
            onReEvaluate={runAllBenchmarks}
            rpkAvgV={rpkAvgV}
            baselines={BASELINE_COMPARISONS}
            onBenchmarkClick={handleBenchmarkClick}
          />
        )}

        {activeTab === 'charts' && (
          <ClusteringMetricsView variant="chart" benchmarks={benchmarks} />
        )}

        {activeTab === 'inspector' && (
          <InspectorTab
            currentDetails={currentDetails}
            boundaryB={boundaryB}
            messages={messages}
            selectedMessage={selectedMessage}
            setSelectedMessage={setSelectedMessage}
            currentSource={currentSource}
            currentDatasetMeta={currentDatasetMeta}
            loading={loading}
            onReParseTrace={() => loadDataset(selectedSource, selectedDataset)}
            onTabChange={setActiveTab}
          />
        )}

        {activeTab === 'stage2' && (
          <CandidateRankingView mode="chart" topCandidate={topCandidate} />
        )}

        {activeTab === 'custom' && (
          <CustomTraceTab
            customText={customText}
            setCustomText={setCustomText}
            customDetails={customDetails}
            runCustomTrace={runCustomTrace}
            loading={loading}
          />
        )}

        {activeTab === 'pairwise' && (
          <PairwiseInspector
            messages={currentDetails?.sample_messages ?? []}
            boundaryB={boundaryB}
            keywords={currentDetails?.keywords}
            hits={currentDetails?.boundary?.hits ?? []}
            datasetName={currentDatasetMeta?.name}
            protocolName={currentDatasetMeta?.protocol}
          />
        )}

        {activeTab === 'pipeline' && (
          <PipelineTab
            executeApiCall={api.executeApiCall}
            sourceId={selectedSource}
            datasetId={selectedDataset}
            maxMessages={selectedMsgCount}
            params={params}
          />
        )}

        {activeTab === 'clusters' && (
          <ClustersTab
            executeApiCall={api.executeApiCall}
            sourceId={selectedSource}
            datasetId={selectedDataset}
            maxMessages={selectedMsgCount}
            params={params}
            datasetName={currentDatasetMeta?.name}
            protocolName={currentDatasetMeta?.protocol}
          />
        )}
      </main>

      <StderrDrawer api={api} />
    </div>
  );
}
