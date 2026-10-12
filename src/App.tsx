import React, { useState, useEffect, useMemo } from 'react';
import { ActiveTab, DatasetMeta, ProtocolDetails, BenchmarkResult, SourceMeta, Hyperparameters, SampleMessage } from './types';
import { DEFAULT_PARAMS, DEFAULT_SOURCES, BASELINE_COMPARISONS, FIG1_HEX } from './constants';
import { useApiCall } from './hooks/useApiCall';
import Header from './components/Header';
import HyperparameterKnobs from './components/HyperparameterKnobs';
import DatasetProvenance from './components/DatasetProvenance';
import StderrDrawer from './components/StderrDrawer';
import ResultsTab from './components/tabs/ResultsTab';
import ChartsTab from './components/tabs/ChartsTab';
import InspectorTab from './components/tabs/InspectorTab';
import Stage2Tab from './components/tabs/Stage2Tab';
import CustomTraceTab from './components/tabs/CustomTraceTab';
import PipelineTab from './components/tabs/PipelineTab';


import { PairwiseInspector } from './components/PairwiseInspector';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('results');
  const [sourcesCatalog, setSourcesCatalog] = useState<Record<string, SourceMeta>>(DEFAULT_SOURCES);
  const [selectedSource, setSelectedSource] = useState<string>('netplier');
  const [selectedDataset, setSelectedDataset] = useState<string>('modbus');
  const [selectedMsgCount, setSelectedMsgCount] = useState<number>(100);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState<boolean>(false);
  const [benchmarkFilter, setBenchmarkFilter] = useState<string>('all');

  const [loading, setLoading] = useState<boolean>(false);
  const [benchLoading, setBenchLoading] = useState<boolean>(false);
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
    for_exclude_rules: params.enabled_detectors.filter((d) => d !== 'sparse'),
  });

  const fetchSources = async () => {
    const { data } = await api.executeApiCall({ cmd: 'get_sources' }, 'sources_catalog');
    if (data?.status === 'ok' && data.catalog) {
      setSourcesCatalog(data.catalog);
    }
  };

  const runAllBenchmarks = async (filterSource: string = benchmarkFilter) => {
    setBenchmarkFilter(filterSource);
    setBenchLoading(true);
    try {
      const { data } = await api.executeApiCall({
        cmd: 'benchmark_all',
        source_id: filterSource,
        config: serializeParams(),
      }, `bench_${filterSource}`);
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
    runAllBenchmarks('all');
  }, []);

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
      runAllBenchmarks('binaryinferno');
    }
  }, [selectedMsgCount]);

  useEffect(() => {
    loadDataset(selectedSource, selectedDataset);
  }, [selectedDataset]);

  const currentSource = sourcesCatalog[selectedSource] || DEFAULT_SOURCES[selectedSource];
  const availableDatasets = currentSource?.datasets || [];
  const currentDatasetMeta = availableDatasets.find((d) => d.id === selectedDataset) || availableDatasets[0];

  const currentDetails = activeTab === 'custom' ? customDetails : protoDetails;
  const boundaryB = currentDetails?.boundary?.B ?? 0;
  const messages = (currentDetails?.sample_messages ?? []) as SampleMessage[];
  const topCandidate =
    currentDetails?.keywords?.['c2s']?.ranking?.[0] ??
    currentDetails?.keywords?.['both']?.ranking?.[0] ??
    null;

  const displayedBenchmarks = benchmarks.filter((b) => {
    if (benchmarkFilter === 'all') return true;
    if (b.source_id !== benchmarkFilter) return false;
    if (b.source_id === 'binaryinferno' && b.total_messages !== undefined) {
      return b.total_messages === selectedMsgCount;
    }
    return true;
  });

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
      />

      {showKnobs && (
        <HyperparameterKnobs
          params={params}
          setParams={setParams}
          onReset={resetParams}
          onApply={() => {
            loadDataset(selectedSource, selectedDataset);
            runAllBenchmarks(benchmarkFilter);
          }}
          selectedSource={selectedSource}
          selectedDataset={selectedDataset}
          benchmarkFilter={benchmarkFilter}
          onRunAllBenchmarks={runAllBenchmarks}
          onLoadDataset={loadDataset}
        />
      )}

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 pb-28">
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

        {activeTab === 'results' && (
          <ResultsTab
            displayedBenchmarks={displayedBenchmarks}
            sourcesCatalog={sourcesCatalog}
            benchmarkFilter={benchmarkFilter}
            onRunAllBenchmarks={runAllBenchmarks}
            benchLoading={benchLoading}
            rpkAvgV={rpkAvgV}
            baselines={BASELINE_COMPARISONS}
            onBenchmarkClick={handleBenchmarkClick}
            onTabChange={setActiveTab}
          />
        )}

        {activeTab === 'charts' && (
          <ChartsTab benchmarks={benchmarks} />
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
          <Stage2Tab topCandidate={topCandidate} />
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
      </main>

      <StderrDrawer api={api} />
    </div>
  );
}
