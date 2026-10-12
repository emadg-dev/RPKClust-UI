import React from 'react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { HealthItem } from '../../types';

interface HealthChecksProps {
  items: HealthItem[];
}

const SEVERITY_META: Record<string, { icon: React.ReactNode; classes: string }> = {
  info: {
    icon: <Info className="w-4 h-4 text-sky-400" />,
    classes: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  },
  warn: {
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  error: {
    icon: <XCircle className="w-4 h-4 text-red-400" />,
    classes: 'bg-red-500/10 text-red-300 border-red-500/30',
  },
};

export default function HealthChecks({ items }: HealthChecksProps) {
  if (items.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="font-bold text-white text-base mb-2">Health checks</h3>
        <p className="text-xs text-slate-500">All checks passed.</p>
      </div>
    );
  }
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="font-bold text-white text-base mb-3">
        Health checks ({items.length})
      </h3>
      <div className="space-y-2">
        {items.map((h, i) => {
          const meta = SEVERITY_META[h.severity] || SEVERITY_META.info;
          return (
            <div
              key={`${h.id}-${i}`}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${meta.classes}`}
            >
              <span className="mt-0.5 shrink-0">{meta.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold font-mono">{h.id}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950/60 text-slate-400 font-mono">
                    {h.stage}
                  </span>
                </div>
                <p className="text-xs mt-0.5 opacity-90">{h.text}</p>
                {Object.keys(h.data).length > 0 && (
                  <p className="text-[10px] font-mono mt-1 opacity-70">
                    {JSON.stringify(h.data)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
