import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Layers,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Info,
  FileCode,
  ArrowLeftRight
} from 'lucide-react';

import { SampleMessage, AlignedByte, AlignmentSummary } from '../types';
import MessageByteViewer from './MessageByteViewer';

export interface StageGate {
  stageNumber: number;
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'diverged' | 'neutral';
  headline: string;
  badgeText: string;
  badgeTone: 'emerald' | 'amber' | 'rose' | 'cyan';
  metricPrimary: { label: string; value: string; unit?: string };
  metricSecondary?: { label: string; value: string };
  formula?: string;
  explanation: string;
  highlights: {
    relevantOffsetsA: number[];
    relevantOffsetsB: number[];
    regionLabel?: string;
  };
  detailsList: Array<{ label: string; val: string }>;
}

interface PairwiseInspectorProps {
  messages: SampleMessage[];
  boundaryB: number;
  keywords?: Record<string, any>;
  hits?: Array<{ rule: string; offset: number; length: number; info?: any }>;
  datasetName?: string;
  protocolName?: string;
}

// Convert hex string to integer byte array
function hexToBytes(hex: string): number[] {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.substr(i, 2), 16) || 0);
  }
  return bytes;
}

// Needleman-Wunsch Global Sequence Alignment Algorithm
function runNeedlemanWunsch(
  bytesA: number[],
  bytesB: number[],
  boundaryB: number,
  hitsA: Record<number, string> = {},
  hitsB: Record<number, string> = {},
  matchScore = 2,
  mismatchScore = -1,
  gapScore = -2
): { aligned: AlignedByte[]; summary: AlignmentSummary } {
  const n = bytesA.length;
  const m = bytesB.length;

  if (n === 0 && m === 0) {
    return {
      aligned: [],
      summary: { alignedLength: 0, matches: 0, mismatches: 0, gaps: 0, identityPercent: 0, score: 0 }
    };
  }

  // DP score table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i * gapScore;
  for (let j = 0; j <= m; j++) dp[0][j] = j * gapScore;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const match = dp[i - 1][j - 1] + (bytesA[i - 1] === bytesB[j - 1] ? matchScore : mismatchScore);
      const deleteA = dp[i - 1][j] + gapScore;
      const insertB = dp[i][j - 1] + gapScore;
      dp[i][j] = Math.max(match, deleteA, insertB);
    }
  }

  // Traceback
  let i = n;
  let j = m;
  const reversed: Array<{
    byteA: number | null;
    byteB: number | null;
    offsetA: number | null;
    offsetB: number | null;
    type: 'match' | 'mismatch' | 'gapA' | 'gapB';
  }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (bytesA[i - 1] === bytesB[j - 1] ? matchScore : mismatchScore)) {
      const isMatch = bytesA[i - 1] === bytesB[j - 1];
      reversed.push({
        byteA: bytesA[i - 1],
        byteB: bytesB[j - 1],
        offsetA: i - 1,
        offsetB: j - 1,
        type: isMatch ? 'match' : 'mismatch'
      });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + gapScore) {
      reversed.push({
        byteA: bytesA[i - 1],
        byteB: null,
        offsetA: i - 1,
        offsetB: null,
        type: 'gapB'
      });
      i--;
    } else {
      reversed.push({
        byteA: null,
        byteB: bytesB[j - 1],
        offsetA: null,
        offsetB: j - 1,
        type: 'gapA'
      });
      j--;
    }
  }

  const rawAligned = reversed.reverse();
  const aligned: AlignedByte[] = rawAligned.map((item, idx) => {
    const hexA = item.byteA !== null ? item.byteA.toString(16).padStart(2, '0').toUpperCase() : '--';
    const hexB = item.byteB !== null ? item.byteB.toString(16).padStart(2, '0').toUpperCase() : '--';
    const asciiA = item.byteA !== null && item.byteA >= 32 && item.byteA <= 126 ? String.fromCharCode(item.byteA) : '·';
    const asciiB = item.byteB !== null && item.byteB >= 32 && item.byteB <= 126 ? String.fromCharCode(item.byteB) : '·';

    const isForA = item.offsetA !== null && item.offsetA < boundaryB;
    const isForB = item.offsetB !== null && item.offsetB < boundaryB;

    return {
      index: idx,
      byteA: item.byteA,
      byteB: item.byteB,
      hexA,
      hexB,
      asciiA,
      asciiB,
      type: item.type,
      offsetA: item.offsetA,
      offsetB: item.offsetB,
      isForA,
      isForB,
      hitA: item.offsetA !== null ? hitsA[item.offsetA] : undefined,
      hitB: item.offsetB !== null ? hitsB[item.offsetB] : undefined
    };
  });

  const matches = aligned.filter((a) => a.type === 'match').length;
  const mismatches = aligned.filter((a) => a.type === 'mismatch').length;
  const gaps = aligned.filter((a) => a.type === 'gapA' || a.type === 'gapB').length;
  const alignedLength = aligned.length;
  const identityPercent = alignedLength > 0 ? Math.round((matches / alignedLength) * 1000) / 10 : 0;
  const score = dp[n][m];

  return {
    aligned,
    summary: {
      alignedLength,
      matches,
      mismatches,
      gaps,
      identityPercent,
      score
    }
  };
}

export const PairwiseInspector: React.FC<PairwiseInspectorProps> = ({
  messages,
  boundaryB,
  keywords,
  hits = [],
  datasetName = 'Active Protocol',
  protocolName = 'Protocol'
}) => {
  const [indexA, setIndexA] = useState<number>(0);
  const [indexB, setIndexB] = useState<number>(messages.length > 1 ? 1 : 0);
  const [activeStage, setActiveStage] = useState<number>(0);
  const [customHexMode, setCustomHexMode] = useState<boolean>(false);
  const [customHexA, setCustomHexA] = useState<string>('00010000000601030000000A');
  const [customHexB, setCustomHexB] = useState<string>('0001000000030103020014');

  // Active message objects
  const msgA: SampleMessage = useMemo(() => {
    if (customHexMode) {
      return {
        id: 991,
        direction: 'c2s',
        hex: customHexA,
        length: hexToBytes(customHexA).length,
        cluster: 'custom_req',
        label: 'Custom Request',
        ts: 100.0,
        session_id: 'cust-1'
      };
    }
    return messages[indexA] ?? {
      id: 0,
      direction: 'c2s',
      hex: '',
      length: 0,
      cluster: 'empty'
    };
  }, [customHexMode, customHexA, messages, indexA]);

  const msgB: SampleMessage = useMemo(() => {
    if (customHexMode) {
      return {
        id: 992,
        direction: 's2c',
        hex: customHexB,
        length: hexToBytes(customHexB).length,
        cluster: 'custom_resp',
        label: 'Custom Response',
        ts: 100.015,
        session_id: 'cust-1',
        paired_id: 991
      };
    }
    return messages[indexB] ?? {
      id: 1,
      direction: 's2c',
      hex: '',
      length: 0,
      cluster: 'empty'
    };
  }, [customHexMode, customHexB, messages, indexB]);

  // Map hits by offset
  const hitsMap: Record<number, string> = useMemo(() => {
    const map: Record<number, string> = {};
    hits.forEach((h) => {
      for (let o = h.offset; o < h.offset + h.length; o++) {
        map[o] = h.rule;
      }
    });
    return map;
  }, [hits]);

  // Bytes for alignment
  const bytesA = useMemo(() => hexToBytes(msgA.hex), [msgA.hex]);
  const bytesB = useMemo(() => hexToBytes(msgB.hex), [msgB.hex]);

  // Needleman-Wunsch Alignment
  const { aligned, summary } = useMemo(() => {
    return runNeedlemanWunsch(bytesA, bytesB, boundaryB, hitsMap, hitsMap);
  }, [bytesA, bytesB, boundaryB, hitsMap]);

  // Evaluate the 5 Stage Gates
  const stageGates: StageGate[] = useMemo(() => {
    const lenA = bytesA.length;
    const lenB = bytesB.length;
    const minLen = Math.min(lenA, lenB);

    // Stage 0: Session & Direction Flow
    const isPairedReqResp =
      (msgA.paired_id === msgB.id || msgB.paired_id === msgA.id) ||
      (msgA.session_id && msgA.session_id === msgB.session_id && msgA.direction !== msgB.direction);
    const isSameDirection = msgA.direction === msgB.direction;
    const timeDeltaMs =
      msgA.ts !== undefined && msgB.ts !== undefined
        ? Math.round(Math.abs(msgA.ts - msgB.ts) * 100000) / 100
        : null;

    let stage0Status: 'pass' | 'fail' | 'diverged' | 'neutral' = 'neutral';
    let stage0Badge = 'SAME DIRECTION';
    let stage0Tone: 'emerald' | 'amber' | 'rose' | 'cyan' = 'cyan';
    let stage0Expl = `Both messages flow in the ${msgA.direction.toUpperCase()} direction. In RPKClust, same-direction messages share identical field semantics and are evaluated under unified clustering constraints.`;

    if (isPairedReqResp) {
      stage0Status = 'pass';
      stage0Badge = 'PAIRED REQUEST-RESPONSE';
      stage0Tone = 'emerald';
      stage0Expl = `Message #${msgA.id} (${msgA.direction.toUpperCase()}) and Message #${msgB.id} (${msgB.direction.toUpperCase()}) form a bidirectional dialogue pair. RPKClust evaluates remote coupling across their functional state transitions.`;
    } else if (!isSameDirection) {
      stage0Status = 'diverged';
      stage0Badge = 'CROSS-SESSION OPPOSING FLOW';
      stage0Tone = 'amber';
      stage0Expl = `Message #${msgA.id} (${msgA.direction.toUpperCase()}) and Message #${msgB.id} (${msgB.direction.toUpperCase()}) originate from distinct or unlinked dialogues. Stage 1 remote coupling considers them neutral.`;
    }

    const gate0: StageGate = {
      stageNumber: 1,
      id: 'session',
      name: 'Session & Direction Flow',
      status: stage0Status,
      headline: isPairedReqResp ? 'Validated Bidirectional Flow Pair' : 'Directional State Comparison',
      badgeText: stage0Badge,
      badgeTone: stage0Tone,
      metricPrimary: {
        label: 'Traffic Direction',
        value: `${msgA.direction.toUpperCase()} ↔ ${msgB.direction.toUpperCase()}`
      },
      metricSecondary: timeDeltaMs !== null ? { label: 'Temporal Offset Δt', value: `${timeDeltaMs} ms` } : undefined,
      formula: 'Direction(A) ⊕ Direction(B), Pair(m_i, m_j) = session_id ∧ (c2s ↔ s2c)',
      explanation: stage0Expl,
      highlights: {
        relevantOffsetsA: [],
        relevantOffsetsB: [],
        regionLabel: 'Flow Scope'
      },
      detailsList: [
        { label: 'Message A Session', val: msgA.session_id || 'Default Session' },
        { label: 'Message B Session', val: msgB.session_id || 'Default Session' },
        { label: 'Traffic Pair Status', val: isPairedReqResp ? 'Direct Pair Linked' : 'Independent Packets' }
      ]
    };

    // Stage 1: FOR Boundary Compliance
    const forRange = Math.min(boundaryB, minLen);
    let forMatches = 0;
    const forOffsets: number[] = [];
    for (let o = 0; o < forRange; o++) {
      if (bytesA[o] === bytesB[o]) {
        forMatches++;
      }
      forOffsets.push(o);
    }
    const forMatchRatio = forRange > 0 ? forMatches / forRange : 1.0;
    const forPass = forMatchRatio >= 0.70;

    const gate1: StageGate = {
      stageNumber: 2,
      id: 'boundary',
      name: 'FOR / NFOR Boundary Compliance',
      status: forPass ? 'pass' : 'fail',
      headline: forPass ? 'Prefix Invariant Intact in [0, B)' : 'Positional Prefix Drift Detected',
      badgeText: forPass ? `FOR STABLE (${forMatches}/${forRange} BYTES)` : `FOR DRIFT (${forMatches}/${forRange} BYTES)`,
      badgeTone: forPass ? 'emerald' : 'rose',
      metricPrimary: {
        label: 'FOR Exact Match Ratio',
        value: `${Math.round(forMatchRatio * 100)}%`
      },
      metricSecondary: { label: 'Fixed Boundary B', value: `${boundaryB} bytes` },
      formula: `FOR = [0, B) where B=${boundaryB}. Matches = Σ I(m_A[i] == m_B[i]) for i < ${forRange}`,
      explanation: forPass
        ? `Within the inferred Fixed-Offset Region [0..${boundaryB - 1}], both packets maintain high positional consistency (${forMatches}/${forRange} bytes identical). Complies with the fixed-header invariant.`
        : `Packet bytes within the prefix region [0..${boundaryB - 1}] diverge substantially (${forRange - forMatches} differences). In RPKClust, this variance indicates shifting formats or distinct message families.`,
      highlights: {
        relevantOffsetsA: forOffsets,
        relevantOffsetsB: forOffsets,
        regionLabel: `FOR Region [0..${boundaryB - 1}]`
      },
      detailsList: [
        { label: 'Inferred Boundary B', val: `${boundaryB} bytes` },
        { label: 'FOR Byte Match Count', val: `${forMatches} of ${forRange}` },
        { label: 'Prefix Consistency', val: forPass ? 'Conforms to FOR Structure' : 'Prefix Divergence' }
      ]
    };

    // Stage 2: Candidate Keyword Extraction
    const activeDir = msgA.direction === msgB.direction ? msgA.direction : 'c2s';
    const kwConfig = keywords?.[activeDir] || keywords?.['both'] || null;
    const topRanking = kwConfig?.ranking?.[0];
    const kwOffset = topRanking?.offset ?? (kwConfig?.offset ?? 0);
    const kwLen = topRanking?.length ?? (kwConfig?.length ?? 1);

    const valA =
      lenA >= kwOffset + kwLen
        ? bytesA.slice(kwOffset, kwOffset + kwLen).map((b) => b.toString(16).padStart(2, '0')).join('')
        : '??';
    const valB =
      lenB >= kwOffset + kwLen
        ? bytesB.slice(kwOffset, kwOffset + kwLen).map((b) => b.toString(16).padStart(2, '0')).join('')
        : '??';

    const candidatesMatch = valA !== '??' && valB !== '??' && valA === valB;
    const kwOffsets = Array.from({ length: kwLen }, (_, i) => kwOffset + i);

    const gate2: StageGate = {
      stageNumber: 3,
      id: 'candidates',
      name: 'Candidate Keyword Extraction',
      status: candidatesMatch ? 'pass' : 'diverged',
      headline: candidatesMatch ? 'Congruent Candidate Values' : 'Divergent Opcode / Candidate Values',
      badgeText: candidatesMatch ? `KEYWORD MATCH (0x${valA.toUpperCase()})` : `KEYWORD DELTA (0x${valA.toUpperCase()} ≠ 0x${valB.toUpperCase()})`,
      badgeTone: candidatesMatch ? 'emerald' : 'amber',
      metricPrimary: {
        label: 'Candidate Offset & Width',
        value: `Offset ${kwOffset} (Length ${kwLen})`
      },
      metricSecondary: { label: 'Extracted Values', value: `0x${valA.toUpperCase()} ↔ 0x${valB.toUpperCase()}` },
      formula: `Cand(m) = m[offset:offset+length] at inferred candidate offset ${kwOffset}`,
      explanation: candidatesMatch
        ? `Both messages share the identical candidate field value (0x${valA.toUpperCase()}) at offset ${kwOffset}. In RPKClust, this candidate serves as the primary intra-cluster keyword attractor.`
        : `Candidate field values at offset ${kwOffset} diverge (0x${valA.toUpperCase()} vs 0x${valB.toUpperCase()}). In NetPlier and RPKClust, opcode/type divergence signals separate functional message types.`,
      highlights: {
        relevantOffsetsA: kwOffsets,
        relevantOffsetsB: kwOffsets,
        regionLabel: `Keyword Field [Offset ${kwOffset}..${kwOffset + kwLen - 1}]`
      },
      detailsList: [
        { label: 'Keyword Region', val: topRanking?.region || 'FOR' },
        { label: 'Message A Value', val: `0x${valA.toUpperCase()}` },
        { label: 'Message B Value', val: `0x${valB.toUpperCase()}` }
      ]
    };

    // Stage 3: Clustering Constraints & Similarity
    // Alignment-free similarity surrogate from stage 1
    const nforA = bytesA.slice(boundaryB);
    const nforB = bytesB.slice(boundaryB);
    let nforMatches = 0;
    const minNfor = Math.min(nforA.length, nforB.length);
    for (let k = 0; k < minNfor; k++) {
      if (nforA[k] === nforB[k]) nforMatches++;
    }
    const denom = forRange * 2 + nforA.length + nforB.length;
    const similarity = denom > 0 ? Math.min(1.0, (2.0 * (forMatches + nforMatches)) / denom) : 1.0;
    const thetaEER = 0.55;
    const similarityPass = similarity >= thetaEER;

    const gate3: StageGate = {
      stageNumber: 4,
      id: 'constraints',
      name: 'Clustering Constraints & Similarity',
      status: similarityPass ? 'pass' : 'fail',
      headline: similarityPass ? 'High Pairwise Similarity (S ≥ θ)' : 'Low Pairwise Similarity (S < θ)',
      badgeText: similarityPass ? `MUST-LINK (S = ${similarity.toFixed(3)})` : `CANNOT-LINK (S = ${similarity.toFixed(3)})`,
      badgeTone: similarityPass ? 'emerald' : 'rose',
      metricPrimary: {
        label: 'Pairwise Similarity S(A, B)',
        value: similarity.toFixed(3)
      },
      metricSecondary: { label: 'EER Decision Threshold θ', value: thetaEER.toFixed(2) },
      formula: 'S(A, B) = 2 · (FOR_matches + NFOR_matches) / Denom vs θ_EER',
      explanation: similarityPass
        ? `Pairwise similarity S(A, B) = ${similarity.toFixed(3)} meets the EER constraint threshold (θ = ${thetaEER}). RPKClust assigns a MUST-LINK probabilistic constraint pull.`
        : `Pairwise similarity S(A, B) = ${similarity.toFixed(3)} is below the EER separation threshold (θ = ${thetaEER}). RPKClust creates a CANNOT-LINK separation boundary.`,
      highlights: {
        relevantOffsetsA: aligned.filter((a) => a.type === 'match' && a.offsetA !== null).map((a) => a.offsetA!),
        relevantOffsetsB: aligned.filter((a) => a.type === 'match' && a.offsetB !== null).map((a) => a.offsetB!),
        regionLabel: 'Aligned Matches'
      },
      detailsList: [
        { label: 'Pairwise Similarity S', val: similarity.toFixed(4) },
        { label: 'EER Cutoff Threshold', val: thetaEER.toFixed(2) },
        { label: 'Constraint Output', val: similarityPass ? 'Positive Constraint (Attractor)' : 'Negative Constraint (Repeller)' }
      ]
    };

    // Stage 4: Final Cluster Assignment & Ground Truth
    const sameCluster = msgA.cluster === msgB.cluster;
    const sameLabel = msgA.label && msgB.label ? msgA.label === msgB.label : null;

    const gate4: StageGate = {
      stageNumber: 5,
      id: 'cluster',
      name: 'Final Cluster Assignment Decision',
      status: sameCluster ? 'pass' : 'diverged',
      headline: sameCluster ? 'Co-Clustered into Unified Message Type' : 'Separated into Distinct Clusters',
      badgeText: sameCluster ? `SAME CLUSTER (${msgA.cluster})` : `DISTINCT (${msgA.cluster} ≠ ${msgB.cluster})`,
      badgeTone: sameCluster ? 'emerald' : 'rose',
      metricPrimary: {
        label: 'Cluster Decisions',
        value: `${msgA.cluster} ↔ ${msgB.cluster}`
      },
      metricSecondary: sameLabel !== null ? { label: 'Ground Truth Match', value: sameLabel ? 'Co-Type' : 'Distinct Type' } : undefined,
      formula: 'arg max P(C_k | S, R, p_bit, p_pos) ⟹ Grouping Decision',
      explanation: sameCluster
        ? `The pipeline assigned both Message #${msgA.id} and Message #${msgB.id} to Cluster "${msgA.cluster}". Two-stage probabilistic inference determined they share the same opcode structure and field semantics.`
        : `Message #${msgA.id} (Cluster "${msgA.cluster}") and Message #${msgB.id} (Cluster "${msgB.cluster}") were separated into different clusters. Probability inference validated their structural divergence.`,
      highlights: {
        relevantOffsetsA: [],
        relevantOffsetsB: [],
        regionLabel: 'Full Packet'
      },
      detailsList: [
        { label: 'Message A Predicted Cluster', val: msgA.cluster },
        { label: 'Message B Predicted Cluster', val: msgB.cluster },
        {
          label: 'Ground Truth Verification',
          val:
            sameLabel !== null
              ? sameLabel === sameCluster
                ? 'Accurate (Matches Ground Truth)'
                : 'Divergent Ground Truth'
              : 'Benchmark Ground Truth Not Available'
        }
      ]
    };

    return [gate0, gate1, gate2, gate3, gate4];
  }, [msgA, msgB, bytesA, bytesB, boundaryB, keywords, aligned]);

  const currentGate = stageGates[activeStage] || stageGates[0];

  // Quick Preset Selection Handlers
  const selectReqRespPreset = () => {
    setCustomHexMode(false);
    for (let i = 0; i < messages.length; i++) {
      const mA = messages[i];
      if (mA.paired_id !== undefined && mA.paired_id !== null) {
        const j = messages.findIndex((m) => m.id === mA.paired_id);
        if (j !== -1 && j !== i) {
          setIndexA(i);
          setIndexB(j);
          return;
        }
      }
      // Or find opposite direction in same session
      if (mA.session_id) {
        const j = messages.findIndex(
          (m, idx) => idx !== i && m.session_id === mA.session_id && m.direction !== mA.direction
        );
        if (j !== -1) {
          setIndexA(i);
          setIndexB(j);
          return;
        }
      }
    }
    // Fallback: pick first c2s and first s2c
    const c2sIdx = messages.findIndex((m) => m.direction === 'c2s');
    const s2cIdx = messages.findIndex((m) => m.direction === 's2c');
    if (c2sIdx !== -1 && s2cIdx !== -1) {
      setIndexA(c2sIdx);
      setIndexB(s2cIdx);
    }
  };

  const selectSameClusterPreset = () => {
    setCustomHexMode(false);
    for (let i = 0; i < messages.length; i++) {
      for (let j = i + 1; j < messages.length; j++) {
        if (messages[i].cluster === messages[j].cluster && messages[i].cluster !== 'unclassified') {
          setIndexA(i);
          setIndexB(j);
          return;
        }
      }
    }
    // Fallback
    if (messages.length > 1) {
      setIndexA(0);
      setIndexB(1);
    }
  };

  const selectDiffClusterPreset = () => {
    setCustomHexMode(false);
    for (let i = 0; i < messages.length; i++) {
      for (let j = i + 1; j < messages.length; j++) {
        if (messages[i].cluster !== messages[j].cluster) {
          setIndexA(i);
          setIndexB(j);
          return;
        }
      }
    }
    if (messages.length > 1) {
      setIndexA(0);
      setIndexB(messages.length - 1);
    }
  };

  const swapMessages = () => {
    if (customHexMode) {
      const tmp = customHexA;
      setCustomHexA(customHexB);
      setCustomHexB(tmp);
    } else {
      const tmp = indexA;
      setIndexA(indexB);
      setIndexB(tmp);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Presets Toolbar */}
      <div className="panel p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-accent-wash border border-accent2-wash-30 text-accent3">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-hi">Pairwise Message Pipeline Inspector</h2>
                <span className="text-xs font-mono text-cyan bg-cyan-dark-wash-60 border border-cyan-deep badge">
                  Needleman-Wunsch Dynamic Alignment
                </span>
              </div>
              <p className="text-xs text-low mt-0.5">
                Align byte streams of any two messages and observe how each byte passes or fails through the 5 pipeline stages.
              </p>
            </div>
          </div>

          {/* Quick Presets Strip */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-low font-medium mr-1">Quick Presets:</span>
            <button
              onClick={selectReqRespPreset}
              className="px-3 py-1.5 rounded text-xs font-medium btn-ghost text-hi border border-strong flex items-center gap-1.5 transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-cyan" />
              Req ↔ Resp Pair
            </button>
            <button
              onClick={selectSameClusterPreset}
              className="px-3 py-1.5 rounded text-xs font-medium btn-ghost text-hi border border-strong flex items-center gap-1.5 transition"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald" />
              Same Cluster
            </button>
            <button
              onClick={selectDiffClusterPreset}
              className="px-3 py-1.5 rounded text-xs font-medium btn-ghost text-hi border border-strong flex items-center gap-1.5 transition"
            >
              <XCircle className="w-3.5 h-3.5 text-rose" />
              Diff Cluster
            </button>
            <button
              onClick={() => setCustomHexMode(!customHexMode)}
              className={`px-3 py-1.5 rounded text-xs font-medium border flex items-center gap-1.5 transition ${
                customHexMode
                  ? 'bg-amber-wash text-amber-soft border-amber-wash-40'
                  : 'btn-ghost text-mid border-strong'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Custom Hex
            </button>
            <button
              onClick={swapMessages}
              title="Swap Message A and B"
              className="p-1.5 rounded text-xs btn-ghost text-mid border border-strong transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dual Message Selection Cards */}
        {customHexMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-default">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-mid flex items-center justify-between">
                <span>Message A Raw Hex Packet:</span>
                <span className="text-faint font-mono text-[11px]">{hexToBytes(customHexA).length} bytes</span>
              </label>
              <textarea
                value={customHexA}
                onChange={(e) => setCustomHexA(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
                className="w-full bg-base border border-strong rounded p-3 text-xs font-mono text-cyan-soft h-20 resize-none focus:outline-none focus-border-cyan2"
                placeholder="Paste hex bytes..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-mid flex items-center justify-between">
                <span>Message B Raw Hex Packet:</span>
                <span className="text-faint font-mono text-[11px]">{hexToBytes(customHexB).length} bytes</span>
              </label>
              <textarea
                value={customHexB}
                onChange={(e) => setCustomHexB(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
                className="w-full bg-base border border-strong rounded p-3 text-xs font-mono text-purple-soft h-20 resize-none focus:outline-none focus-border-purple2"
                placeholder="Paste hex bytes..."
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-default">
            {/* Selector A */}
            <div className="panel-inner p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan" />
                  Message A
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-low font-mono">{msgA.length}B</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      msgA.direction === 'c2s'
                        ? 'bg-blue-wash text-blue-soft border border-blue-wash-30'
                        : 'bg-emerald-wash text-emerald-soft border border-emerald-wash-30'
                    }`}
                  >
                    {msgA.direction}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-wash text-purple-soft border border-purple-wash-30">
                    Cluster: {msgA.cluster}
                  </span>
                </div>
              </div>

              <select
                value={indexA}
                onChange={(e) => setIndexA(Number(e.target.value))}
                className="w-full bg-panel border border-strong text-xs text-hi rounded p-2 font-mono focus:outline-none focus-border-cyan2"
              >
                {messages.map((m, idx) => (
                  <option key={m.id} value={idx}>
                    #{m.id} [{m.direction.toUpperCase()}] ({m.length}B) - Cluster: {m.cluster}
                    {m.label ? ` · [${m.label}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector B */}
            <div className="panel-inner p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple" />
                  Message B
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-low font-mono">{msgB.length}B</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      msgB.direction === 'c2s'
                        ? 'bg-blue-wash text-blue-soft border border-blue-wash-30'
                        : 'bg-emerald-wash text-emerald-soft border border-emerald-wash-30'
                    }`}
                  >
                    {msgB.direction}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-wash text-purple-soft border border-purple-wash-30">
                    Cluster: {msgB.cluster}
                  </span>
                </div>
              </div>

              <select
                value={indexB}
                onChange={(e) => setIndexB(Number(e.target.value))}
                className="w-full bg-panel border border-strong text-xs text-hi rounded p-2 font-mono focus:outline-none focus-border-purple2"
              >
                {messages.map((m, idx) => (
                  <option key={m.id} value={idx}>
                    #{m.id} [{m.direction.toUpperCase()}] ({m.length}B) - Cluster: {m.cluster}
                    {m.label ? ` · [${m.label}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <MessageByteViewer
        mode="aligned"
        aligned={aligned}
        summary={summary}
        boundaryB={boundaryB}
        highlightOffsetsA={currentGate.highlights.relevantOffsetsA}
        highlightOffsetsB={currentGate.highlights.relevantOffsetsB}
      />

      {/* Interactive 5-Stage Pipeline Stepper & Pass/Fail Evaluation Gates */}
      <div className="panel p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent3" />
              <h3 className="font-semibold text-hi">5-Stage Pipeline Evaluation Gates</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={activeStage === 0}
                onClick={() => setActiveStage(Math.max(0, activeStage - 1))}
                className="px-3 py-1 btn-ghost disabled:opacity-40 text-mid text-xs rounded flex items-center gap-1 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev Stage
              </button>
              <button
                disabled={activeStage === stageGates.length - 1}
                onClick={() => setActiveStage(Math.min(stageGates.length - 1, activeStage + 1))}
                className="px-3 py-1 btn-ghost disabled:opacity-40 text-mid text-xs rounded flex items-center gap-1 transition"
              >
                Next Stage <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-low mt-1">
            Step through each mathematical phase of RPKClust to see why the two messages passed or failed clustering criteria.
          </p>
        </div>

        {/* Horizontal Stepper Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {stageGates.map((gate, sIdx) => {
            const isActive = activeStage === sIdx;
            let statusIcon = <CheckCircle className="w-3.5 h-3.5 text-emerald" />;
            if (gate.status === 'fail') statusIcon = <XCircle className="w-3.5 h-3.5 text-rose" />;
            if (gate.status === 'diverged') statusIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber" />;
            if (gate.status === 'neutral') statusIcon = <Info className="w-3.5 h-3.5 text-cyan" />;

            return (
              <button
                key={gate.id}
                onClick={() => setActiveStage(sIdx)}
                className={`p-3 rounded border text-left transition relative ${
                  isActive
                    ? 'bg-inset border-accent2'
                    : 'bg-base border-default hover-bg-inset'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-mono text-[10px] text-faint uppercase">Stage 0{gate.stageNumber}</span>
                  {statusIcon}
                </div>
                <div className={`text-xs font-semibold truncate ${isActive ? 'text-hi' : 'text-mid'}`}>
                  {gate.name}
                </div>
                <div className="text-[10px] text-low truncate mt-1">
                  {gate.badgeText}
                </div>
                {isActive && <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-accent2 rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Active Stage Gate Card */}
        <div className="bg-base border border-default rounded-md p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-default pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="badge text-[11px] font-mono font-bold bg-accent2-wash text-accent-soft border border-accent2-wash-30">
                  STAGE 0{currentGate.stageNumber}
                </span>
                <h4 className="text-lg font-bold text-hi">{currentGate.headline}</h4>
              </div>
              <p className="text-xs text-low mt-1">{currentGate.explanation}</p>
            </div>

            {/* Primary Pass/Fail Badge */}
            <div
              className={`px-3.5 py-1.5 rounded border text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 ${
                currentGate.badgeTone === 'emerald'
                  ? 'bg-emerald-wash-15 text-emerald-soft border-emerald-wash-40'
                  : currentGate.badgeTone === 'rose'
                  ? 'bg-rose-wash-15 text-rose-soft border-rose-wash-40'
                  : currentGate.badgeTone === 'amber'
                  ? 'bg-amber-wash-15 text-amber-soft border-amber-wash-40'
                  : 'bg-cyan-wash-15 text-cyan-soft border-cyan-wash-40'
              }`}
            >
              {currentGate.status === 'pass' && <CheckCircle className="w-4 h-4 text-emerald" />}
              {currentGate.status === 'fail' && <XCircle className="w-4 h-4 text-rose" />}
              {currentGate.status === 'diverged' && <AlertTriangle className="w-4 h-4 text-amber" />}
              {currentGate.status === 'neutral' && <Info className="w-4 h-4 text-cyan" />}
              {currentGate.badgeText}
            </div>
          </div>

          {/* Metrics HUD & Evaluation Math */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-panel border border-default rounded p-4">
              <span className="text-[11px] text-low uppercase tracking-wider block">
                {currentGate.metricPrimary.label}
              </span>
              <div className="text-2xl font-bold font-mono text-cyan mt-1">
                {currentGate.metricPrimary.value}
              </div>
              {currentGate.formula && (
                <div className="text-[10px] font-mono text-faint mt-2 truncate" title={currentGate.formula}>
                  Formula: {currentGate.formula}
                </div>
              )}
            </div>

            {currentGate.metricSecondary && (
              <div className="bg-panel border border-default rounded p-4">
                <span className="text-[11px] text-low uppercase tracking-wider block">
                  {currentGate.metricSecondary.label}
                </span>
                <div className="text-2xl font-bold font-mono text-purple mt-1">
                  {currentGate.metricSecondary.value}
                </div>
                <div className="text-[10px] font-mono text-faint mt-2">
                  Paper benchmark comparative baseline
                </div>
              </div>
            )}

            <div className="bg-panel border border-default rounded p-4 space-y-2">
              <span className="text-[11px] text-low uppercase tracking-wider block">Diagnostic Summary</span>
              {currentGate.detailsList.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-low">{item.label}:</span>
                  <span className="font-mono font-medium text-hi">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
