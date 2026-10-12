import React from 'react';
import { Sliders, RefreshCw } from 'lucide-react';
import ByteHexView from '../ByteHexView';
import { BoundaryDiagnostics } from '../BoundaryDiagnostics';
import CandidateRankingTable from '../CandidateRankingTable';
import { ProtocolDetails, SampleMessage, SourceMeta, DatasetMeta, ActiveTab } from '../../types';

interface InspectorTabProps {
  currentDetails: ProtocolDetails | null;
  boundaryB: number;
  messages: SampleMessage[];
  selectedMessage: number;
  setSelectedMessage: (idx: number) => void;
  currentSource: SourceMeta;
  currentDatasetMeta: DatasetMeta | undefined;
  loading: boolean;
  onReParseTrace: () => void;
  onTabChange: (tab: ActiveTab) => void;
}

export default function InspectorTab({
  currentDetails,
  boundaryB,
  messages,
  selectedMessage,
  setSelectedMessage,
  currentSource,
  currentDatasetMeta,
  loading,
  onReParseTrace,
  onTabChange,
}: InspectorTabProps) {
  const activeMsg = messages[selectedMessage] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between bg-panel border border-default p-4 rounded gap-4">
        <div className="flex items-center gap-3">
          <Sliders className="w-5 h-5 text-accent3" />
          <span className="text-sm font-semibold text-mid">Active Trace:</span>
          <span className="px-3 py-1 rounded bg-accent text-hi text-xs font-bold font-mono">
            {currentDatasetMeta?.name}
          </span>
          <span className="text-xs text-low">
            Source: <strong className="text-hi">{currentSource.name}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReParseTrace}
            disabled={loading}
            className="px-3 py-1 btn-ghost text-hi text-xs font-medium rounded flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan' : ''}`} />
            Re-parse Trace
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ByteHexView
          activeMsg={activeMsg}
          boundaryB={boundaryB}
          currentDetails={currentDetails}
          selectedMessage={selectedMessage}
          messages={messages}
          onMessageChange={setSelectedMessage}
        />

        <BoundaryDiagnostics
          boundaryB={boundaryB}
          minLen={currentDetails?.boundary?.min_len ?? null}
          candidateCount={currentDetails?.candidates?.length ?? null}
          hits={currentDetails?.boundary?.hits ?? []}
        />
      </div>

      <CandidateRankingTable
        ranking={
          currentDetails?.keywords?.['c2s']?.ranking ??
          currentDetails?.keywords?.['both']?.ranking
        }
      />
    </div>
  );
}
