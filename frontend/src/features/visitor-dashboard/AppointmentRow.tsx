'use client';

import * as React from 'react';
import { ChevronRight, Clock } from 'lucide-react';
import { StatusChip } from '@/components/mobile/StatusChip';
import { IST_TIMEZONE } from '@/lib/datetime';
import type { VisitorAppointment } from '@/lib/services/visitorPortalService';
import { visitorVisitPath } from '@/lib/static-export-route';
import { cn } from '@/lib/utils';
import { GatePassButton } from './GatePassButton';
import { hasGatePass, hostLabel } from './visit-filters';

function dateBlock(value: string | null): { day: string; month: string; weekday: string; time: string } | null {
  if (!value) return null;
  const date = new Date(value);
  const part = (options: Intl.DateTimeFormatOptions): string =>
    new Intl.DateTimeFormat('en-IN', { timeZone: IST_TIMEZONE, ...options }).format(date);
  return {
    day: part({ day: 'numeric' }),
    month: part({ month: 'short' }),
    weekday: part({ weekday: 'short' }),
    time: part({ hour: 'numeric', minute: '2-digit' }),
  };
}

interface AppointmentRowProps {
  item: VisitorAppointment;
  highlighted?: boolean;
}

export function AppointmentRow({ item, highlighted = false }: AppointmentRowProps): React.ReactElement {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const block = dateBlock(item.appointmentDate);

  React.useEffect(() => {
    if (!highlighted) return;
    rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlighted]);

  return (
    <div
      ref={rowRef}
      className={cn(
        'overflow-hidden rounded-2xl border bg-white transition-shadow',
        'border-slate-200 hover:border-[#001B71]/20 hover:shadow-sm',
        highlighted && 'ring-2 ring-emerald-500 ring-offset-2',
      )}
    >
      <a
        href={visitorVisitPath(item.bookingId)}
        className="flex w-full items-center gap-3 p-3 text-left lg:gap-4 lg:p-4"
      >
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#001B71]/[0.06] text-[#001B71]">
          {block ? (
            <>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#001B71]/70">
                {block.month}
              </span>
              <span className="text-xl font-bold leading-none">{block.day}</span>
            </>
          ) : (
            <Clock className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">
            {hostLabel(item)}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {[item.departmentName, item.branchName].filter(Boolean).join(' · ') || '—'}
          </p>
          {block ? (
            <p className="mt-0.5 text-xs font-medium text-[#1d5fae]">
              {block.weekday}, {block.time}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusChip status={item.status} />
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#1d5fae]">
            Details
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </a>
      {hasGatePass(item) ? (
        <div className="border-t border-slate-100 px-3 py-3 lg:px-4">
          <GatePassButton item={item} className="w-full lg:w-auto" />
        </div>
      ) : null}
    </div>
  );
}
