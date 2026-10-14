import * as React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'brand';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  info: 'bg-[#4A90E2]/12 text-[#1d5fae]',
  warning: 'bg-amber-100 text-amber-800',
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-red-100 text-red-700',
  brand: 'bg-[#001B71]/10 text-[#001B71]',
};

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  REQUEST_SENT: { label: 'Awaiting doctor', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'info' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  CHECKED_IN: { label: 'Checked in', tone: 'success' },
  CHECKED_OUT: { label: 'Completed', tone: 'neutral' },
  DRAFT: { label: 'Draft', tone: 'neutral' },
  SCHEDULED: { label: 'Scheduled', tone: 'info' },
  ON_HOLD: { label: 'On hold', tone: 'warning' },
  ARRIVED_AT_GATE: { label: 'At gate', tone: 'brand' },
  GATE_VERIFIED: { label: 'Gate verified', tone: 'brand' },
  IN_PROGRESS: { label: 'In progress', tone: 'brand' },
  RECEIVED: { label: 'Received', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  EXITED: { label: 'Exited', tone: 'neutral' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
  ACTIVE: { label: 'Active', tone: 'success' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
  REVOKED: { label: 'Revoked', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
  PENDING_VERIFICATION: { label: 'Pending verification', tone: 'warning' },
  UNASSIGNED: { label: 'Unassigned', tone: 'neutral' },
  ASSIGNED: { label: 'Assigned', tone: 'info' },
  VOID: { label: 'Void', tone: 'neutral' },
};

function humanize(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part, i) => (i === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export function statusLabel(status: string): string {
  return STATUS_MAP[status.toUpperCase()]?.label ?? humanize(status);
}

interface StatusChipProps {
  status: string;
  /** Override the label from the status map. */
  label?: string;
  tone?: Tone;
  className?: string;
}

export function StatusChip({ status, label, tone, className }: StatusChipProps): React.ReactElement {
  const entry = STATUS_MAP[status.toUpperCase()];
  const resolvedTone = tone ?? entry?.tone ?? 'neutral';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold',
        TONE_CLASS[resolvedTone],
        className,
      )}
    >
      {label ?? entry?.label ?? humanize(status)}
    </span>
  );
}
