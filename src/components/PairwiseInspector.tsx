import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Layers,
  Binary,
  Hash,
  Activity,
  Zap,
  RotateCcw,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Check,
  Eye,
  FileCode,
  ArrowLeftRight
} from 'lucide-react';

export interface SampleMessage {
  id: number;
  direction: string;
  hex: string;
  length: number;
  cluster: string;
  label?: string | null;
  session_id?: string | null;
  ts?: number;
  paired_id?: number | null;
}

export interface AlignedByte {
  index: number;
  byteA: number | null;
  byteB: number | null;
  hexA: string;
  hexB: string;
  asciiA: string;
  asciiB: string;
  type: 'match' | 'mismatch' | 'gapA' | 'gapB';
  offsetA: number | null;
  offsetB: number | null;
  isForA: boolean;
  isForB: boolean;
  hitA?: string;
  hitB?: string;
}

export interface AlignmentSummary {
  alignedLength: number;
  matches: number;
  mismatches: number;
  gaps: number;
  identityPercent: number;
  score: number;
}

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
  const [hoveredAlignedIdx, setHoveredAlignedIdx] = useState<number | null>(null);
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">Pairwise Message Pipeline Inspector</h2>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded">
                  Needleman-Wunsch Dynamic Alignment
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Align byte streams of any two messages and observe how each byte passes or fails through the 5 pipeline stages.
              </p>
            </div>
          </div>

          {/* Quick Presets Strip */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium mr-1">Quick Presets:</span>
            <button
              onClick={selectReqRespPreset}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
              Req ↔ Resp Pair
            </button>
            <button
              onClick={selectSameClusterPreset}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Same Cluster
            </button>
            <button
              onClick={selectDiffClusterPreset}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              Diff Cluster
            </button>
            <button
              onClick={() => setCustomHexMode(!customHexMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                customHexMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Custom Hex
            </button>
            <button
              onClick={swapMessages}
              title="Swap Message A and B"
              className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dual Message Selection Cards */}
        {customHexMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Message A Raw Hex Packet:</span>
                <span className="text-slate-500 font-mono text-[11px]">{hexToBytes(customHexA).length} bytes</span>
              </label>
              <textarea
                value={customHexA}
                onChange={(e) => setCustomHexA(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-cyan-300 h-20 resize-none focus:outline-none focus:border-cyan-500"
                placeholder="Paste hex bytes..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Message B Raw Hex Packet:</span>
                <span className="text-slate-500 font-mono text-[11px]">{hexToBytes(customHexB).length} bytes</span>
              </label>
              <textarea
                value={customHexB}
                onChange={(e) => setCustomHexB(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-purple-300 h-20 resize-none focus:outline-none focus:border-purple-500"
                placeholder="Paste hex bytes..."
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            {/* Selector A */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Message A
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-mono">{msgA.length}B</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      msgA.direction === 'c2s'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {msgA.direction}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Cluster: {msgA.cluster}
                  </span>
                </div>
              </div>

              <select
                value={indexA}
                onChange={(e) => setIndexA(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:border-cyan-500"
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
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Message B
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-mono">{msgB.length}B</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      msgB.direction === 'c2s'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {msgB.direction}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Cluster: {msgB.cluster}
                  </span>
                </div>
              </div>

              <select
                value={indexB}
                onChange={(e) => setIndexB(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:border-purple-500"
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

      {/* Global Sequence Alignment Stats & Color Legend */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Binary className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Sequence Alignment & Synchronized Hex Stream</h3>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
              <span className="text-emerald-300">Match (=)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500/50" />
              <span className="text-rose-300">Mismatch (≠)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-700/50 border border-dashed border-slate-500" />
              <span className="text-slate-400">Gap (–)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-400" />
              <span className="text-cyan-300">FOR Region [0..{boundaryB - 1}]</span>
            </span>
          </div>
        </div>

        {/* Alignment Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">Aligned Positions</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{summary.alignedLength}</div>
          </div>
          <div className="bg-slate-950 border border-emerald-900/40 rounded-xl p-3 text-center">
            <div className="text-[11px] text-emerald-400 uppercase tracking-wider">Exact Matches</div>
            <div className="text-xl font-bold font-mono text-emerald-300 mt-0.5">
              {summary.matches} <span className="text-xs text-emerald-500 font-normal">({summary.identityPercent}%)</span>
            </div>
          </div>
          <div className="bg-slate-950 border border-rose-900/40 rounded-xl p-3 text-center">
            <div className="text-[11px] text-rose-400 uppercase tracking-wider">Mismatches</div>
            <div className="text-xl font-bold font-mono text-rose-300 mt-0.5">{summary.mismatches}</div>
          </div>
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">Gaps / Indels</div>
            <div className="text-xl font-bold font-mono text-slate-300 mt-0.5">{summary.gaps}</div>
          </div>
          <div className="bg-slate-950 border border-cyan-900/40 rounded-xl p-3 text-center">
            <div className="text-[11px] text-cyan-400 uppercase tracking-wider">Alignment Score</div>
            <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">{summary.score}</div>
          </div>
        </div>

        {/* Split Aligned Hex Stream */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto space-y-3">
          <div className="inline-block min-w-full">
            {/* Header: Column offsets & Region demarcation */}
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800 text-[11px] font-mono text-slate-500">
              <span className="w-16 shrink-0 text-right pr-2">Offset:</span>
              <div className="flex gap-1">
                {aligned.map((col, idx) => (
                  <span
                    key={idx}
                    className={`w-8 text-center shrink-0 ${
                      col.offsetA !== null && col.offsetA < boundaryB ? 'text-cyan-400 font-bold' : 'text-slate-500'
                    }`}
                  >
                    {idx < 100 ? idx.toString().padStart(2, '0') : idx}
                  </span>
                ))}
              </div>
            </div>

            {/* Region Label Bar */}
            <div className="flex items-center gap-1.5 py-1 text-[10px] font-mono">
              <span className="w-16 shrink-0 text-right pr-2 text-slate-500">Region:</span>
              <div className="flex gap-1">
                {aligned.map((col, idx) => {
                  const isFor = (col.offsetA !== null && col.offsetA < boundaryB) || (col.offsetB !== null && col.offsetB < boundaryB);
                  return (
                    <span
                      key={idx}
                      className={`w-8 text-center shrink-0 rounded-[2px] py-0.5 ${
                        isFor ? 'bg-cyan-950/70 text-cyan-300 font-semibold border-b border-cyan-500' : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      {isFor ? 'FOR' : 'NFOR'}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Message A Bytes */}
            <div className="flex items-center gap-1.5 py-1 text-xs font-mono">
              <span className="w-16 shrink-0 text-right pr-2 text-cyan-400 font-semibold">Msg A:</span>
              <div className="flex gap-1">
                {aligned.map((col, idx) => {
                  const isHovered = hoveredAlignedIdx === idx;
                  const isHighlightedInStage =
                    (col.offsetA !== null && currentGate.highlights.relevantOffsetsA.includes(col.offsetA)) ||
                    (col.offsetB !== null && currentGate.highlights.relevantOffsetsB.includes(col.offsetB));

                  let bgClass = 'bg-slate-900 text-slate-400 border border-slate-800';
                  if (col.type === 'match') {
                    bgClass = 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 font-bold';
                  } else if (col.type === 'mismatch') {
                    bgClass = 'bg-rose-950/70 text-rose-300 border border-rose-500/40 font-bold';
                  } else {
                    bgClass = 'bg-slate-900/40 text-slate-600 border border-dashed border-slate-800';
                  }

                  if (isHighlightedInStage) {
                    bgClass += ' ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950';
                  }

                  if (isHovered) {
                    bgClass += ' brightness-150 scale-105 z-10 transition-transform';
                  }

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredAlignedIdx(idx)}
                      onMouseLeave={() => setHoveredAlignedIdx(null)}
                      className={`w-8 h-8 rounded flex items-center justify-center shrink-0 cursor-pointer select-none transition-all ${bgClass}`}
                      title={`Aligned #${idx} | Msg A: ${col.hexA} (Offset ${col.offsetA ?? 'Gap'})`}
                    >
                      {col.hexA}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connector Line */}
            <div className="flex items-center gap-1.5 py-0.5 text-xs font-mono">
              <span className="w-16 shrink-0 text-right pr-2 text-slate-600">Match:</span>
              <div className="flex gap-1">
                {aligned.map((col, idx) => {
                  let char = ' ';
                  let color = 'text-slate-600';
                  if (col.type === 'match') {
                    char = '|';
                    color = 'text-emerald-400 font-bold';
                  } else if (col.type === 'mismatch') {
                    char = '≠';
                    color = 'text-rose-400 font-bold';
                  } else {
                    char = '·';
                    color = 'text-slate-700';
                  }
                  return (
                    <span key={idx} className={`w-8 text-center shrink-0 ${color}`}>
                      {char}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Message B Bytes */}
            <div className="flex items-center gap-1.5 py-1 text-xs font-mono">
              <span className="w-16 shrink-0 text-right pr-2 text-purple-400 font-semibold">Msg B:</span>
              <div className="flex gap-1">
                {aligned.map((col, idx) => {
                  const isHovered = hoveredAlignedIdx === idx;
                  const isHighlightedInStage =
                    (col.offsetA !== null && currentGate.highlights.relevantOffsetsA.includes(col.offsetA)) ||
                    (col.offsetB !== null && currentGate.highlights.relevantOffsetsB.includes(col.offsetB));

                  let bgClass = 'bg-slate-900 text-slate-400 border border-slate-800';
                  if (col.type === 'match') {
                    bgClass = 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 font-bold';
                  } else if (col.type === 'mismatch') {
                    bgClass = 'bg-rose-950/70 text-rose-300 border border-rose-500/40 font-bold';
                  } else {
                    bgClass = 'bg-slate-900/40 text-slate-600 border border-dashed border-slate-800';
                  }

                  if (isHighlightedInStage) {
                    bgClass += ' ring-2 ring-purple-400 ring-offset-1 ring-offset-slate-950';
                  }

                  if (isHovered) {
                    bgClass += ' brightness-150 scale-105 z-10 transition-transform';
                  }

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredAlignedIdx(idx)}
                      onMouseLeave={() => setHoveredAlignedIdx(null)}
                      className={`w-8 h-8 rounded flex items-center justify-center shrink-0 cursor-pointer select-none transition-all ${bgClass}`}
                      title={`Aligned #${idx} | Msg B: ${col.hexB} (Offset ${col.offsetB ?? 'Gap'})`}
                    >
                      {col.hexB}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ASCII Preview */}
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-900 text-[11px] font-mono text-slate-500">
              <span className="w-16 shrink-0 text-right pr-2">ASCII:</span>
              <div className="flex gap-1">
                {aligned.map((col, idx) => (
                  <span key={idx} className="w-8 text-center shrink-0 text-slate-400">
                    {col.asciiA === col.asciiB && col.asciiA !== '·' ? (
                      <span className="text-emerald-400 font-bold">{col.asciiA}</span>
                    ) : (
                      <span>
                        {col.asciiA}
                        {col.asciiB !== col.asciiA ? `/${col.asciiB}` : ''}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hover Inspector Tooltip Strip */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono flex flex-wrap items-center justify-between gap-2 min-h-10">
          {hoveredAlignedIdx !== null && aligned[hoveredAlignedIdx] ? (
            (() => {
              const col = aligned[hoveredAlignedIdx];
              return (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-slate-300 font-semibold">Position #{hoveredAlignedIdx}:</span>
                  <span className="text-cyan-400">
                    Msg A: 0x{col.hexA} (Offset {col.offsetA !== null ? col.offsetA : 'Gap'})
                  </span>
                  <span className="text-slate-500">↔</span>
                  <span className="text-purple-400">
                    Msg B: 0x{col.hexB} (Offset {col.offsetB !== null ? col.offsetB : 'Gap'})
                  </span>
                  <span className="text-slate-500">·</span>
                  <span
                    className={`font-bold ${
                      col.type === 'match'
                        ? 'text-emerald-400'
                        : col.type === 'mismatch'
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {col.type.toUpperCase()}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">
                    Region: {col.isForA || col.isForB ? 'Fixed-Offset (FOR)' : 'Non-Fixed (NFOR)'}
                  </span>
                  {col.hitA && (
                    <span className="text-amber-400 bg-amber-950/60 border border-amber-800 px-1.5 py-0.5 rounded text-[11px]">
                      Detector Rule: {col.hitA}
                    </span>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="text-slate-500 flex items-center gap-2">
              <Info className="w-3.5 h-3.5" />
              <span>Hover any aligned byte cell above to inspect offset positions, detector hits, and exact hex values.</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive 5-Stage Pipeline Stepper & Pass/Fail Evaluation Gates */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-white">5-Stage Pipeline Evaluation Gates</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={activeStage === 0}
                onClick={() => setActiveStage(Math.max(0, activeStage - 1))}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs rounded-lg flex items-center gap-1 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev Stage
              </button>
              <button
                disabled={activeStage === stageGates.length - 1}
                onClick={() => setActiveStage(Math.min(stageGates.length - 1, activeStage + 1))}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs rounded-lg flex items-center gap-1 transition"
              >
                Next Stage <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Step through each mathematical phase of RPKClust to see why the two messages passed or failed clustering criteria.
          </p>
        </div>

        {/* Horizontal Stepper Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {stageGates.map((gate, sIdx) => {
            const isActive = activeStage === sIdx;
            let statusIcon = <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
            if (gate.status === 'fail') statusIcon = <XCircle className="w-3.5 h-3.5 text-rose-400" />;
            if (gate.status === 'diverged') statusIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
            if (gate.status === 'neutral') statusIcon = <Info className="w-3.5 h-3.5 text-cyan-400" />;

            return (
              <button
                key={gate.id}
                onClick={() => setActiveStage(sIdx)}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  isActive
                    ? 'bg-slate-800/90 border-indigo-500 shadow-lg shadow-indigo-950/50'
                    : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-mono text-[10px] text-slate-500 uppercase">Stage 0{gate.stageNumber}</span>
                  {statusIcon}
                </div>
                <div className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {gate.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-1">
                  {gate.badgeText}
                </div>
                {isActive && <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-indigo-500 rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Active Stage Gate Card */}
        <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  STAGE 0{currentGate.stageNumber}
                </span>
                <h4 className="text-lg font-bold text-white">{currentGate.headline}</h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">{currentGate.explanation}</p>
            </div>

            {/* Primary Pass/Fail Badge */}
            <div
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 ${
                currentGate.badgeTone === 'emerald'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : currentGate.badgeTone === 'rose'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                  : currentGate.badgeTone === 'amber'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
              }`}
            >
              {currentGate.status === 'pass' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              {currentGate.status === 'fail' && <XCircle className="w-4 h-4 text-rose-400" />}
              {currentGate.status === 'diverged' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {currentGate.status === 'neutral' && <Info className="w-4 h-4 text-cyan-400" />}
              {currentGate.badgeText}
            </div>
          </div>

          {/* Metrics HUD & Evaluation Math */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                {currentGate.metricPrimary.label}
              </span>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                {currentGate.metricPrimary.value}
              </div>
              {currentGate.formula && (
                <div className="text-[10px] font-mono text-slate-500 mt-2 truncate" title={currentGate.formula}>
                  Formula: {currentGate.formula}
                </div>
              )}
            </div>

            {currentGate.metricSecondary && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                  {currentGate.metricSecondary.label}
                </span>
                <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
                  {currentGate.metricSecondary.value}
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-2">
                  Paper benchmark comparative baseline
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Diagnostic Summary</span>
              {currentGate.detailsList.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{item.label}:</span>
                  <span className="font-mono font-medium text-slate-200">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
