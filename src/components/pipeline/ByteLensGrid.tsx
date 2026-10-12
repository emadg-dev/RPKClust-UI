import React from 'react';
import { ByteInfo, RuleEval, TrueKeyword } from '../../types';

export type LensKind = 'region' | 'status' | 'tags' | 'in_S' | 'satisfaction';

interface ByteLensGridProps {
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
      (r) =>
        r.rule === rule && r.offset <= offset && offset < r.offset + r.length,
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

export default function ByteLensGrid({
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
}: ByteLensGridProps) {
  const PER_ROW = 32;

  const trueRanges: Array<[number, number]> = [];
  if (trueKeyword) {
    trueRanges.push([
      trueKeyword.offset,
      trueKeyword.offset + trueKeyword.length,
    ]);
  }
  const isTrue = (offset: number) =>
    trueRanges.some(([a, b]) => offset >= a && offset < b);

  const cellClasses = (b: ByteInfo): string => {
    switch (lens) {
      case 'region':
        return b.region === 'FOR'
          ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
          : 'bg-violet-500/20 text-violet-200 border-violet-500/40';
      case 'status':
        if (b.status === 'excluded')
          return 'bg-red-500/20 text-red-200 border-red-500/40';
        if (b.status === 'rescued')
          return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40';
        if (b.status === 'not_evaluated')
          return 'bg-slate-700/40 text-slate-500 border-slate-700';
        return 'bg-slate-800 text-slate-200 border-slate-700';
      case 'tags':
        if (b.tags.length >= 2)
          return 'bg-amber-500/25 text-amber-200 border-amber-500/40';
        if (b.tags.length === 1)
          return 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40';
        return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'in_S':
        return b.in_S
          ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
          : 'bg-slate-800 text-slate-400 border-slate-700';
      case 'satisfaction': {
        const sat = satisfactionFor(rules, b.offset, satRule, satLength);
        if (sat.msgOk === true)
          return 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50';
        if (sat.msgOk === false)
          return 'bg-red-500/25 text-red-200 border-red-500/50';
        return 'bg-slate-800 text-slate-500 border-slate-700';
      }
      default:
        return 'bg-slate-800 text-slate-200 border-slate-700';
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
        className="bg-slate-950 rounded-xl border border-slate-800 p-3 overflow-x-auto outline-none focus:ring-2 focus:ring-indigo-500/50"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            onSelectByte(Math.max(0, selectedByte - 1));
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            onSelectByte(
              Math.min(bytes.length - 1, selectedByte + 1),
            );
          } else if (e.key === '[') {
            e.preventDefault();
            onPrevMessage();
          } else if (e.key === ']') {
            e.preventDefault();
            onNextMessage();
          }
        }}
      >
        {Array.from(
          { length: Math.ceil(bytes.length / PER_ROW) },
          (_, row) => (
            <div key={row} className="flex gap-0.5 mb-0.5">
              {bytes
                .slice(row * PER_ROW, (row + 1) * PER_ROW)
                .map((b) => {
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
                      )} ${
                        selected
                          ? 'ring-2 ring-white/80 z-10'
                          : 'hover:ring-1 hover:ring-slate-500'
                      }`}
                    >
                      <span>{b.hex}</span>
                      <span className="text-[8px] opacity-60">{b.offset}</span>
                      {sat && !sat.exact && sat.msgOk !== null && (
                        <span className="absolute -top-1 -right-1 text-[7px] px-0.5 bg-slate-900 text-amber-400 rounded border border-amber-500/40">
                          w{sat.width}
                        </span>
                      )}
                      {trueByte && (
                        <span className="absolute -top-1 -left-1 text-[7px] px-0.5 bg-amber-500 text-slate-950 rounded font-bold">
                          T
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          ),
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-400">
        {lens === 'region' && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-cyan-500/40 border border-cyan-500/60" />
              FOR (keyword region)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-violet-500/40 border border-violet-500/60" />
              NFOR
            </span>
          </>
        )}
        {lens === 'status' && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-red-500/40 border border-red-500/60" />
              excluded
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500/60" />
              rescued
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-700/60 border border-slate-600" />
              available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-700" />
              not evaluated
            </span>
          </>
        )}
        {lens === 'tags' && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-500/60" />
              2+ tags
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500/40 border border-indigo-500/60" />
              1 tag
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-700/60 border border-slate-600" />
              untagged
            </span>
          </>
        )}
        {lens === 'in_S' && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500/60" />
              in S (available)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-700/60 border border-slate-600" />
              not in S
            </span>
          </>
        )}
        {lens === 'satisfaction' && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500/60" />
              satisfied
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-red-500/40 border border-red-500/60" />
              violated
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-700/60 border border-slate-600" />
              not evaluable
            </span>
            <span className="flex items-center gap-1">
              <span className="text-amber-400 font-bold">w2</span>
              covered by wider window
            </span>
          </>
        )}
        <span className="flex items-center gap-1">
          <span className="text-amber-400 font-bold">T</span>
          TRUE (catalog, eval only)
        </span>
        <span className="ml-auto font-mono">
          ←/→ move byte · [ ] prev/next message
        </span>
      </div>
    </div>
  );
}

export { RULES, SAT_LENGTHS };
