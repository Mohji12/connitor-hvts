import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  ON_HOLD: 'On hold',
  ARRIVED_AT_GATE: 'At gate',
  GATE_VERIFIED: 'Gate verified',
  APPROVED: 'Approved',
  IN_PROGRESS: 'At dock',
  RECEIVED: 'Received',
  EXITED: 'Exited',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
};

const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'border-slate-200 bg-slate-50 text-slate-700',
  SCHEDULED: 'border-amber-200 bg-amber-50 text-amber-900',
  ON_HOLD: 'border-rose-200 bg-rose-50 text-rose-900',
  ARRIVED_AT_GATE: 'border-orange-200 bg-orange-50 text-orange-900',
  GATE_VERIFIED: 'border-orange-200 bg-orange-50 text-orange-900',
  APPROVED: 'border-sky-200 bg-sky-50 text-sky-900',
  IN_PROGRESS: 'border-teal-200 bg-teal-50 text-teal-900',
  RECEIVED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  EXITED: 'border-slate-200 bg-slate-100 text-slate-600',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CLOSED: 'border-slate-200 bg-slate-100 text-slate-500',
  REJECTED: 'border-red-200 bg-red-50 text-red-800',
};

export function DeliveryStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}): React.ReactElement {
  const label = DELIVERY_STATUS_LABELS[status] ?? status;
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', STATUS_CLASS[status] ?? 'bg-muted', className)}
    >
      {label}
    </Badge>
  );
}
