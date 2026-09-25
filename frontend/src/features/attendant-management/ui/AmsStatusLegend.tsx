import * as React from 'react';
import { cn } from '@/lib/utils';

const LEGEND = [
  { color: 'bg-emerald-500', label: 'Inside' },
  { color: 'bg-sky-500', label: 'Waiting Approval' },
  { color: 'bg-amber-400', label: 'Exit Due' },
  { color: 'bg-red-500', label: 'Overstayed' },
];

export function AmsStatusLegend({ className }: { className?: string }): React.ReactElement {
  return (
    <div className={cn('flex flex-wrap gap-4 text-sm', className)}>
      {LEGEND.map((item) => (
        <div key={item.label} className="inline-flex items-center gap-2">
          <span className={cn('size-3 rounded-full', item.color)} />
          <span className="text-slate-700">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
