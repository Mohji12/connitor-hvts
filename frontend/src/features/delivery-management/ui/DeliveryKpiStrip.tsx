import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DELIVERY_STATUS_LABELS } from './DeliveryStatusBadge';
import { cn } from '@/lib/utils';

export function DeliveryKpiStrip({
  total,
  byStatus,
  className,
}: {
  total: number;
  byStatus?: Record<string, number> | null;
  className?: string;
}): React.ReactElement {
  const entries = Object.entries(byStatus ?? {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4', className)}>
      <Card className="border-[#001B71]/08 bg-white/90 shadow-sm max-lg:py-3">
        <CardContent className="pt-4 max-lg:px-3 max-lg:pt-0">
          <p className="text-xs font-medium uppercase tracking-wide text-primary/70 max-lg:text-[10px]">Total</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 max-lg:text-2xl">{total}</p>
        </CardContent>
      </Card>
      {entries.slice(0, 3).map(([status, count]) => (
        <Card key={status} className="border-[#001B71]/08 bg-white/90 shadow-sm max-lg:py-3">
          <CardContent className="pt-4 max-lg:px-3 max-lg:pt-0">
            <p className="text-xs font-medium uppercase tracking-wide text-primary/70 max-lg:text-[10px] max-lg:leading-tight">
              {DELIVERY_STATUS_LABELS[status] ?? status}
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900 max-lg:text-2xl">{count}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
