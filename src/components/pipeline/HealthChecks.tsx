import React from 'react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { HealthItem } from '../../types';

interface HealthChecksProps {
  items: HealthItem[];
}

const SEVERITY_META: Record<string, { icon: React.ReactNode; classes: string }> = {
  info: {
    icon: <Info className="w-4 h-4 text-sky" />,
    classes: 'bg-sky-wash-10 text-sky-soft border-sky-wash-30',
  },
  warn: {
    icon: <AlertTriangle className="w-4 h-4 text-amber" />,
    classes: 'bg-amber-wash-10 text-amber-soft border-amber-wash-30',
  },
  error: {
    icon: <XCircle className="w-4 h-4 text-red" />,
    classes: 'bg-red-wash-10 text-red-soft border-red-wash-30',
  },
};

export default function HealthChecks({ items }: HealthChecksProps) {
  if (items.length === 0) {
    return (
      <div className="panel p-5">
        <h3 className="font-bold text-hi text-base mb-2">Health checks</h3>
        <p className="text-xs text-faint">All checks passed.</p>
      </div>
    );
  }
  return (
    <div className="panel p-5">
      <h3 className="font-bold text-hi text-base mb-3">
        Health checks ({items.length})
      </h3>
      <div className="space-y-2">
        {items.map((h, i) => {
          const meta = SEVERITY_META[h.severity] || SEVERITY_META.info;
          return (
            <div
              key={`${h.id}-${i}`}
              className={`flex items-start gap-3 px-3 py-2.5 rounded border ${meta.classes}`}
            >
              <span className="mt-0.5 shrink-0">{meta.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold font-mono">{h.id}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-base text-low font-mono">
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
