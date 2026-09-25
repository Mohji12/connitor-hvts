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
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <Card className="border-[#001B71]/08 bg-white/90 shadow-sm">
        <CardContent className="pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-primary/70">Total</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{total}</p>
        </CardContent>
      </Card>
      {entries.slice(0, 3).map(([status, count]) => (
        <Card key={status} className="border-[#001B71]/08 bg-white/90 shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-primary/70">
              {DELIVERY_STATUS_LABELS[status] ?? status}
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{count}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
