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
                          ? 'border-mid z-10'
                          : 'hover-border-faint'
                      }`}
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
          ),
        )}
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

export { RULES, SAT_LENGTHS };
