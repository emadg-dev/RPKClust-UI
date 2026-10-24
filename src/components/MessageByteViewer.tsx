import React from 'react';
import { Binary, LayoutGrid, BarChart3 } from 'lucide-react';
import {
  SampleMessage,
  ByteInfo,
  RuleEval,
  TrueKeyword,
  AlignedByte,
  AlignmentSummary,
  LensKind,
} from '../types';

export type { LensKind };

const RULES = [
  'constant',
  'sequence',
  'timestamp',
  'sparse',
  'checksum',
  'address',
  'float',
  'length',
];

const SAT_LENGTHS = [1, 2, 4];

export { RULES, SAT_LENGTHS };

interface SatResult {
  msgOk: boolean | null;
  width: number;
  exact: boolean;
}

function satisfactionFor(
  rules: RuleEval[],
  offset: number,
  rule: string,
  length: number,
): SatResult {
  const exact = rules.find(
    (r) => r.rule === rule && r.offset === offset && r.length === length,
  );
  if (exact) {
    return { msgOk: exact.msg_ok, width: length, exact: true };
  }
  const covering = rules
    .filter(
      (r) => r.rule === rule && r.offset <= offset && offset < r.offset + r.length,
    )
    .sort((a, b) => a.length - b.length);
  if (covering.length > 0) {
    return {
      msgOk: covering[0].msg_ok,
      width: covering[0].length,
      exact: false,
    };
  }
  return { msgOk: null, width: length, exact: false };
}

// ---------------------------------------------------------------------------
// Single mode — replaces ByteHexView
// ---------------------------------------------------------------------------

interface SingleModeProps {
  activeMsg: SampleMessage | null;
  boundaryB: number;
  keywordOffset: number | null;
  keywordLength: number;
  selectedMessage: number;
  messages: SampleMessage[];
  onMessageChange: (idx: number) => void;
}

function SingleMode({
  activeMsg,
  boundaryB,
  keywordOffset,
  keywordLength,
  selectedMessage,
  messages,
  onMessageChange,
}: SingleModeProps) {
  return (
    <div className="lg:col-span-2 panel p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-hi">Byte-Level Message Region Highlighting</h3>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-wash-30 border border-amber-wash-50" />
            <span className="text-amber-soft">FOR (Offset 0..{boundaryB - 1})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-wash-30 border border-orange-wash-50" />
            <span className="text-orange-soft">NFOR</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-wash-40 border border-cyan" />
            <span className="text-cyan-soft">Inferred Keyword</span>
          </span>
        </div>
      </div>

      {activeMsg ? (
        <div className="bg-base rounded p-4 border border-default font-mono text-xs overflow-x-auto space-y-2">
          <div className="text-low text-xs flex justify-between border-b border-default pb-2">
            <span>Message #{activeMsg.id} ({activeMsg.direction})</span>
            <span>Length: {activeMsg.length} bytes | Cluster: {activeMsg.cluster}</span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {Array.from({ length: activeMsg.length }).map((_, byteIdx) => {
              const hexByte = activeMsg.hex.slice(byteIdx * 2, byteIdx * 2 + 2);
              const isFOR = byteIdx < boundaryB;
              const isKeyword =
                keywordOffset !== null &&
                keywordOffset !== undefined &&
                byteIdx >= keywordOffset &&
                byteIdx < keywordOffset + keywordLength;

              let bgClass = isFOR
                ? 'bg-amber-dark-wash-40 text-amber-hi border-amber-strong-wash'
                : 'bg-orange-dark-wash text-orange-hi border-orange-strong-wash';

              if (isKeyword) {
                bgClass = 'bg-cyan-wash-30 text-cyan-hi border-cyan';
              }

              return (
                <div
                  key={byteIdx}
                  className={`flex flex-col items-center justify-center p-1.5 rounded border transition ${bgClass}`}
                  title={`Byte Offset: ${byteIdx} (0x${byteIdx.toString(16)})\nRegion: ${
                    isFOR ? 'FOR' : 'NFOR'
                  }${isKeyword ? ' (Keyword Field)' : ''}`}
                >
                  <span className="text-[10px] text-faint">{byteIdx}</span>
                  <span className="font-bold text-sm tracking-wider uppercase">{hexByte}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-base rounded p-8 border border-default text-center text-faint text-xs font-mono">
          No message loaded. Select a dataset above.
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-low">
          Viewing packet <strong className="text-hi">{selectedMessage + 1}</strong> of <strong className="text-hi">{messages.length}</strong>
        </span>
        <div className="flex gap-2">
          <button
            disabled={selectedMessage === 0}
            onClick={() => onMessageChange(Math.max(0, selectedMessage - 1))}
            className="px-3 py-1 btn-ghost disabled:opacity-40 text-xs rounded font-medium"
          >
            Previous
          </button>
          <button
            disabled={selectedMessage >= messages.length - 1}
            onClick={() => onMessageChange(Math.min(messages.length - 1, selectedMessage + 1))}
            className="px-3 py-1 btn-ghost disabled:opacity-40 text-xs rounded font-medium"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid mode — replaces ByteLensGrid
// ---------------------------------------------------------------------------

interface GridModeProps {
  bytes: ByteInfo[];
  rules: RuleEval[];
  trueKeyword: TrueKeyword | null;
  selectedByte: number;
  onSelectByte: (offset: number) => void;
  onPrevMessage: () => void;
  onNextMessage: () => void;
  lens: LensKind;
  satRule: string;
  satLength: number;
}

function GridMode({
  bytes,
  rules,
  trueKeyword,
  selectedByte,
  onSelectByte,
  onPrevMessage,
  onNextMessage,
  lens,
  satRule,
  satLength,
}: GridModeProps) {
  const PER_ROW = 32;

  const trueRanges: Array<[number, number]> = [];
  if (trueKeyword) {
    trueRanges.push([trueKeyword.offset, trueKeyword.offset + trueKeyword.length]);
  }
  const isTrue = (offset: number) =>
    trueRanges.some(([a, b]) => offset >= a && offset < b);

  const cellClasses = (b: ByteInfo): string => {
    switch (lens) {
      case 'region':
        return b.region === 'FOR'
          ? 'bg-cyan-wash text-cyan-hi border-cyan-wash-40'
          : 'bg-violet-wash-20 text-violet-hi border-violet-wash-40';
      case 'status':
        if (b.status === 'excluded')
          return 'bg-red-wash text-red-hi border-red-wash-40';
        if (b.status === 'rescued')
          return 'bg-emerald-wash text-emerald-hi border-emerald-wash-40';
        if (b.status === 'not_evaluated')
          return 'bg-inset2-wash-40 text-faint border-strong';
        return 'bg-inset text-hi border-strong';
      case 'tags':
        if (b.tags.length >= 2)
          return 'bg-amber-wash-25 text-amber-hi border-amber-wash-40';
        if (b.tags.length === 1)
          return 'bg-accent2-wash text-accent-faint border-accent2-wash-40';
        return 'bg-inset text-low border-strong';
      case 'in_S':
        return b.in_S
          ? 'bg-emerald-wash text-emerald-hi border-emerald-wash-40'
          : 'bg-inset text-low border-strong';
      case 'satisfaction': {
        const sat = satisfactionFor(rules, b.offset, satRule, satLength);
        if (sat.msgOk === true)
          return 'bg-emerald-wash-25 text-emerald-hi border-emerald-wash-50';
        if (sat.msgOk === false)
          return 'bg-red-wash-25 text-red-hi border-red-wash-50';
        return 'bg-inset text-faint border-strong';
      }
      default:
        return 'bg-inset text-hi border-strong';
    }
  };

  const cellTitle = (b: ByteInfo): string => {
    const parts = [
      `offset ${b.offset}`,
      `0x${b.hex}`,
      b.region,
      `status=${b.status}`,
      b.tags.length > 0 ? `tags=[${b.tags.join(',')}]` : 'no tags',
      b.in_S ? 'in S' : 'not in S',
      `candidates=[${b.candidate_ids.join(',')}]`,
    ];
    if (lens === 'satisfaction') {
      const sat = satisfactionFor(rules, b.offset, satRule, satLength);
      parts.push(
        `${satRule}@${b.offset}/${satLength}: ${
          sat.msgOk === null
            ? 'not evaluable'
            : sat.msgOk
              ? 'satisfied'
              : 'violated'
        }${sat.exact ? '' : ` (narrowest covering w=${sat.width})`}`,
      );
    }
    if (isTrue(b.offset)) {
      parts.push('TRUE (catalog, eval only)');
    }
    return parts.join(' · ');
  };

  return (
    <div>
      <div
        className="stat overflow-x-auto focus-border-stronger"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            onSelectByte(Math.max(0, selectedByte - 1));
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            onSelectByte(Math.min(bytes.length - 1, selectedByte + 1));
          } else if (e.key === '[') {
            e.preventDefault();
            onPrevMessage();
          } else if (e.key === ']') {
            e.preventDefault();
            onNextMessage();
          }
        }}
      >
        {Array.from({ length: Math.ceil(bytes.length / PER_ROW) }, (_, row) => (
          <div key={row} className="flex gap-0.5 mb-0.5">
            {bytes.slice(row * PER_ROW, (row + 1) * PER_ROW).map((b) => {
              const sat =
                lens === 'satisfaction'
                  ? satisfactionFor(rules, b.offset, satRule, satLength)
                  : null;
              const selected = b.offset === selectedByte;
              const trueByte = isTrue(b.offset);
              return (
                <button
                  key={b.offset}
                  onClick={() => onSelectByte(b.offset)}
                  title={cellTitle(b)}
                  className={`relative w-7 h-9 rounded border font-mono text-[10px] flex flex-col items-center justify-center transition ${cellClasses(
                    b,
                  )} ${selected ? 'border-mid z-10' : 'hover-border-faint'}`}
                >
                  <span>{b.hex}</span>
                  <span className="text-[8px] opacity-60">{b.offset}</span>
                  {sat && !sat.exact && sat.msgOk !== null && (
                    <span className="absolute -top-1 -right-1 text-[7px] px-0.5 bg-panel text-amber rounded border border-amber-wash-40">
                      w{sat.width}
                    </span>
                  )}
                  {trueByte && (
                    <span className="absolute -top-1 -left-1 text-[7px] px-0.5 bg-amber2 text-base rounded font-bold">
                      T
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-low">
        {lens === 'region' && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-cyan-wash-40 border border-cyan-wash-60" />
              FOR (keyword region)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-violet-wash-40 border border-violet-wash-60" />
              NFOR
            </span>
          </>
        )}
        {lens === 'status' && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-red-wash-40 border border-red-wash-60" />
              excluded
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-wash-40 border border-emerald-wash-60" />
              rescued
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-inset2-wash-60 border border-stronger" />
              available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-inset border border-strong" />
              not evaluated
            </span>
          </>
        )}
        {lens === 'tags' && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-wash-40 border border-amber-wash-60" />
              2+ tags
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-accent2-wash-40 border border-accent2-wash-60" />
              1 tag
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-inset2-wash-60 border border-stronger" />
              untagged
            </span>
          </>
        )}
        {lens === 'in_S' && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-wash-40 border border-emerald-wash-60" />
              in S (available)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-inset2-wash-60 border border-stronger" />
              not in S
            </span>
          </>
        )}
        {lens === 'satisfaction' && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-wash-40 border border-emerald-wash-60" />
              satisfied
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-red-wash-40 border border-red-wash-60" />
              violated
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-inset2-wash-60 border border-stronger" />
              not evaluable
            </span>
            <span className="flex items-center gap-1">
              <span className="text-amber font-bold">w2</span>
              covered by wider window
            </span>
          </>
        )}
        <span className="flex items-center gap-1">
          <span className="text-amber font-bold">T</span>
          TRUE (catalog, eval only)
        </span>
        <span className="ml-auto font-mono">
          ←/→ move byte · [ ] prev/next message
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aligned mode — replaces PairwiseInspector alignment rendering
// ---------------------------------------------------------------------------

interface AlignedModeProps {
  aligned: AlignedByte[];
  summary: AlignmentSummary | null;
  boundaryB: number;
  highlightOffsetsA: number[];
  highlightOffsetsB: number[];
}

function AlignedMode({
  aligned,
  summary,
  boundaryB,
  highlightOffsetsA,
  highlightOffsetsB,
}: AlignedModeProps) {
  const [hoveredAlignedIdx, setHoveredAlignedIdx] = React.useState<number | null>(null);

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-default pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-hi">Sequence Alignment & Synchronized Hex Stream</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-wash-30 border border-emerald-wash-50" />
            <span className="text-emerald-soft">Match (=)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-wash-30 border border-rose-wash-50" />
            <span className="text-rose-soft">Mismatch (≠)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-inset2-wash-50 border border-dashed border-faint" />
            <span className="text-low">Gap (–)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-wash-30 border border-cyan" />
            <span className="text-cyan-soft">FOR Region [0..{boundaryB - 1}]</span>
          </span>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="panel-inner p-3 text-center">
            <div className="text-[11px] text-low uppercase tracking-wider">Aligned Positions</div>
            <div className="text-xl font-bold font-mono text-hi mt-0.5">{summary.alignedLength}</div>
          </div>
          <div className="bg-base border border-emerald-abyss-wash rounded p-3 text-center">
            <div className="text-[11px] text-emerald uppercase tracking-wider">Exact Matches</div>
            <div className="text-xl font-bold font-mono text-emerald-soft mt-0.5">
              {summary.matches} <span className="text-xs text-emerald2 font-normal">({summary.identityPercent}%)</span>
            </div>
          </div>
          <div className="bg-base border border-rose-abyss-wash-40 rounded p-3 text-center">
            <div className="text-[11px] text-rose uppercase tracking-wider">Mismatches</div>
            <div className="text-xl font-bold font-mono text-rose-soft mt-0.5">{summary.mismatches}</div>
          </div>
          <div className="panel-inner p-3 text-center">
            <div className="text-[11px] text-low uppercase tracking-wider">Gaps / Indels</div>
            <div className="text-xl font-bold font-mono text-mid mt-0.5">{summary.gaps}</div>
          </div>
          <div className="bg-base border border-cyan-abyss-wash rounded p-3 text-center">
            <div className="text-[11px] text-cyan uppercase tracking-wider">Alignment Score</div>
            <div className="text-xl font-bold font-mono text-cyan-soft mt-0.5">{summary.score}</div>
          </div>
        </div>
      )}

      <div className="panel-inner p-4 overflow-x-auto space-y-3">
        <div className="inline-block min-w-full">
          <div className="flex items-center gap-1.5 pb-2 border-b border-default text-[11px] font-mono text-faint">
            <span className="w-16 shrink-0 text-right pr-2">Offset:</span>
            <div className="flex gap-1">
              {aligned.map((col, idx) => (
                <span
                  key={idx}
                  className={`w-8 text-center shrink-0 ${
                    col.offsetA !== null && col.offsetA < boundaryB ? 'text-cyan font-bold' : 'text-faint'
                  }`}
                >
                  {idx < 100 ? idx.toString().padStart(2, '0') : idx}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 py-1 text-[10px] font-mono">
            <span className="w-16 shrink-0 text-right pr-2 text-faint">Region:</span>
            <div className="flex gap-1">
              {aligned.map((col, idx) => {
                const isFor = (col.offsetA !== null && col.offsetA < boundaryB) || (col.offsetB !== null && col.offsetB < boundaryB);
                return (
                  <span
                    key={idx}
                    className={`w-8 text-center shrink-0 rounded-[2px] py-0.5 ${
                      isFor ? 'bg-cyan-dark-wash text-cyan-soft font-semibold border-b border-cyan2' : 'bg-panel text-faint'
                    }`}
                  >
                    {isFor ? 'FOR' : 'NFOR'}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 py-1 text-xs font-mono">
            <span className="w-16 shrink-0 text-right pr-2 text-cyan font-semibold">Msg A:</span>
            <div className="flex gap-1">
              {aligned.map((col, idx) => {
                const isHovered = hoveredAlignedIdx === idx;
                const isHighlightedInStage =
                  (col.offsetA !== null && highlightOffsetsA.includes(col.offsetA)) ||
                  (col.offsetB !== null && highlightOffsetsB.includes(col.offsetB));

                let bgClass = 'bg-panel text-low border border-default';
                if (col.type === 'match') {
                  bgClass = 'bg-emerald-dark-wash text-emerald-soft border border-emerald-wash-40 font-bold';
                } else if (col.type === 'mismatch') {
                  bgClass = 'bg-rose-dark-wash-70 text-rose-soft border border-rose-wash-40 font-bold';
                } else {
                  bgClass = 'bg-panel-wash-40 text-fainter border border-dashed border-default';
                }

                if (isHighlightedInStage) {
                  bgClass += ' outline outline-1 outline-cyan';
                }

                if (isHovered) {
                  bgClass += ' brightness-150 z-10';
                }

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredAlignedIdx(idx)}
                    onMouseLeave={() => setHoveredAlignedIdx(null)}
                    className={`w-8 h-8 rounded flex items-center justify-center shrink-0 cursor-pointer select-none transition ${bgClass}`}
                    title={`Aligned #${idx} | Msg A: ${col.hexA} (Offset ${col.offsetA ?? 'Gap'})`}
                  >
                    {col.hexA}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 py-0.5 text-xs font-mono">
            <span className="w-16 shrink-0 text-right pr-2 text-fainter">Match:</span>
            <div className="flex gap-1">
              {aligned.map((col, idx) => {
                let char = ' ';
                let color = 'text-fainter';
                if (col.type === 'match') {
                  char = '|';
                  color = 'text-emerald font-bold';
                } else if (col.type === 'mismatch') {
                  char = '≠';
                  color = 'text-rose font-bold';
                } else {
                  char = '·';
                  color = 'text-fainter';
                }
                return (
                  <span key={idx} className={`w-8 text-center shrink-0 ${color}`}>
                    {char}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 py-1 text-xs font-mono">
            <span className="w-16 shrink-0 text-right pr-2 text-purple font-semibold">Msg B:</span>
            <div className="flex gap-1">
              {aligned.map((col, idx) => {
                const isHovered = hoveredAlignedIdx === idx;
                const isHighlightedInStage =
                  (col.offsetA !== null && highlightOffsetsA.includes(col.offsetA)) ||
                  (col.offsetB !== null && highlightOffsetsB.includes(col.offsetB));

                let bgClass = 'bg-panel text-low border border-default';
                if (col.type === 'match') {
                  bgClass = 'bg-emerald-dark-wash text-emerald-soft border border-emerald-wash-40 font-bold';
                } else if (col.type === 'mismatch') {
                  bgClass = 'bg-rose-dark-wash-70 text-rose-soft border border-rose-wash-40 font-bold';
                } else {
                  bgClass = 'bg-panel-wash-40 text-fainter border border-dashed border-default';
                }

                if (isHighlightedInStage) {
                  bgClass += ' outline outline-1 outline-purple';
                }

                if (isHovered) {
                  bgClass += ' brightness-150 z-10';
                }

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredAlignedIdx(idx)}
                    onMouseLeave={() => setHoveredAlignedIdx(null)}
                    className={`w-8 h-8 rounded flex items-center justify-center shrink-0 cursor-pointer select-none transition ${bgClass}`}
                    title={`Aligned #${idx} | Msg B: ${col.hexB} (Offset ${col.offsetB ?? 'Gap'})`}
                  >
                    {col.hexB}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1.5 border-t border-dark text-[11px] font-mono text-faint">
            <span className="w-16 shrink-0 text-right pr-2">ASCII:</span>
            <div className="flex gap-1">
              {aligned.map((col, idx) => (
                <span key={idx} className="w-8 text-center shrink-0 text-low">
                  {col.asciiA === col.asciiB && col.asciiA !== '·' ? (
                    <span className="text-emerald font-bold">{col.asciiA}</span>
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

      <div className="panel-inner px-4 py-2.5 text-xs font-mono flex flex-wrap items-center justify-between gap-2 min-h-10">
        {hoveredAlignedIdx !== null && aligned[hoveredAlignedIdx] ? (
          (() => {
            const col = aligned[hoveredAlignedIdx];
            return (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-mid font-semibold">Position #{hoveredAlignedIdx}:</span>
                <span className="text-cyan">
                  Msg A: 0x{col.hexA} (Offset {col.offsetA !== null ? col.offsetA : 'Gap'})
                </span>
                <span className="text-faint">↔</span>
                <span className="text-purple">
                  Msg B: 0x{col.hexB} (Offset {col.offsetB !== null ? col.offsetB : 'Gap'})
                </span>
                <span className="text-faint">·</span>
                <span
                  className={`font-bold ${
                    col.type === 'match'
                      ? 'text-emerald'
                      : col.type === 'mismatch'
                        ? 'text-rose'
                        : 'text-low'
                  }`}
                >
                  {col.type.toUpperCase()}
                </span>
                <span className="text-faint">·</span>
                <span className="text-low">
                  Region: {col.isForA || col.isForB ? 'Fixed-Offset (FOR)' : 'Non-Fixed (NFOR)'}
                </span>
                {col.hitA && (
                  <span className="text-amber bg-amber-dark-wash-60 border border-amber-deep px-1.5 py-0.5 rounded text-[11px]">
                    Detector Rule: {col.hitA}
                  </span>
                )}
              </div>
            );
          })()
        ) : (
          <div className="text-faint flex items-center gap-2">
            <span>Hover any aligned byte cell above to inspect offset positions, detector hits, and exact hex values.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface MessageByteViewerProps {
  mode: 'single' | 'aligned' | 'grid';
  boundaryB: number;

  activeMsg?: SampleMessage | null;
  selectedMessage?: number;
  messages?: SampleMessage[];
  onMessageChange?: (idx: number) => void;
  keywordOffset?: number | null;
  keywordLength?: number;

  bytes?: ByteInfo[];
  rules?: RuleEval[];
  trueKeyword?: TrueKeyword | null;
  selectedByte?: number;
  onSelectByte?: (offset: number) => void;
  onPrevMessage?: () => void;
  onNextMessage?: () => void;
  lens?: LensKind;
  satRule?: string;
  satLength?: number;

  aligned?: AlignedByte[];
  summary?: AlignmentSummary | null;
  highlightOffsetsA?: number[];
  highlightOffsetsB?: number[];
}

export default function MessageByteViewer(props: MessageByteViewerProps) {
  switch (props.mode) {
    case 'single':
      return (
        <SingleMode
          activeMsg={props.activeMsg ?? null}
          boundaryB={props.boundaryB}
          keywordOffset={props.keywordOffset ?? null}
          keywordLength={props.keywordLength ?? 1}
          selectedMessage={props.selectedMessage ?? 0}
          messages={props.messages ?? []}
          onMessageChange={props.onMessageChange ?? (() => {})}
        />
      );
    case 'grid':
      return (
        <GridMode
          bytes={props.bytes ?? []}
          rules={props.rules ?? []}
          trueKeyword={props.trueKeyword ?? null}
          selectedByte={props.selectedByte ?? 0}
          onSelectByte={props.onSelectByte ?? (() => {})}
          onPrevMessage={props.onPrevMessage ?? (() => {})}
          onNextMessage={props.onNextMessage ?? (() => {})}
          lens={props.lens ?? 'region'}
          satRule={props.satRule ?? 'sparse'}
          satLength={props.satLength ?? 1}
        />
      );
    case 'aligned':
      return (
        <AlignedMode
          aligned={props.aligned ?? []}
          summary={props.summary ?? null}
          boundaryB={props.boundaryB}
          highlightOffsetsA={props.highlightOffsetsA ?? []}
          highlightOffsetsB={props.highlightOffsetsB ?? []}
        />
      );
  }
}