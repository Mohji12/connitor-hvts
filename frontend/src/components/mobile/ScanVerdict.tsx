import * as React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ScanVerdictTone = 'allow' | 'deny' | 'warn';

const TONES: Record<ScanVerdictTone, { box: string; icon: React.ElementType }> = {
  allow: { box: 'bg-emerald-600 text-white', icon: CheckCircle2 },
  deny: { box: 'bg-red-600 text-white', icon: XCircle },
  warn: { box: 'bg-amber-500 text-white', icon: AlertTriangle },
};

interface ScanVerdictProps {
  tone: ScanVerdictTone;
  title: string;
  subtitle?: string;
  className?: string;
}

/** Large, glanceable gate decision shown at the top of a scan result on phones. */
export function ScanVerdict({ tone, title, subtitle, className }: ScanVerdictProps): React.ReactElement {
  const { box, icon: Icon } = TONES[tone];
  return (
    <div
      className={cn('flex items-center gap-3 rounded-2xl px-4 py-4 shadow-sm', box, className)}
      data-testid={`scan-verdict-${tone}`}
    >
      <Icon className="h-10 w-10 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight">{title}</p>
        {subtitle ? <p className="mt-0.5 text-sm text-white/90">{subtitle}</p> : null}
      </div>
    </div>
  );
}
