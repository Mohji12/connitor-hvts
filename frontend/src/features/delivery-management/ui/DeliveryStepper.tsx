import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DeliveryStepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}): React.ReactElement {
  return (
    <ol className={cn('flex flex-wrap gap-2', className)}>
      {steps.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li
            key={label}
            className={cn(
              'flex min-w-[7.5rem] flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-xs sm:text-sm',
              active && 'border-amber-400 bg-amber-50 text-amber-950 shadow-sm',
              done && 'border-teal-200 bg-teal-50/80 text-teal-900',
              !active && !done && 'border-slate-200 bg-white text-slate-500',
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                active && 'bg-amber-600 text-white',
                done && 'bg-teal-600 text-white',
                !active && !done && 'bg-slate-100 text-slate-500',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : step}
            </span>
            <span className="font-medium leading-tight">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
