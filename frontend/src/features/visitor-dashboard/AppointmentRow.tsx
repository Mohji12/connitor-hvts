'use client';

import * as React from 'react';
import { ChevronDown, Clock, LogIn, LogOut, MessageSquare, Stethoscope, XCircle } from 'lucide-react';
import { StatusChip } from '@/components/mobile/StatusChip';
import { IST_TIMEZONE, formatIstDateTime } from '@/lib/datetime';
import type { VisitorAppointment } from '@/lib/services/visitorPortalService';
import { cn } from '@/lib/utils';
import { GatePassButton } from './GatePassButton';
import { doctorLabel, hasGatePass } from './visit-filters';

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

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-sm text-slate-800">{children}</p>
      </div>
    </div>
  );
}

interface AppointmentRowProps {
  item: VisitorAppointment;
  highlighted?: boolean;
}

export function AppointmentRow({ item, highlighted = false }: AppointmentRowProps): React.ReactElement {
  const [open, setOpen] = React.useState(highlighted);
  const rowRef = React.useRef<HTMLDivElement>(null);
  const block = dateBlock(item.appointmentDate);
  const detailsId = `visit-${item.bookingId}`;

  React.useEffect(() => {
    if (!highlighted) return;
    setOpen(true);
    rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlighted]);

  return (
    <div
      ref={rowRef}
      className={cn(
        'overflow-hidden rounded-2xl border bg-white transition-shadow',
        open ? 'border-[#001B71]/15 shadow-md' : 'border-slate-200 hover:border-[#001B71]/20 hover:shadow-sm',
        highlighted && 'ring-2 ring-emerald-500 ring-offset-2',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={detailsId}
        className="flex w-full items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4A90E2] sm:gap-4 sm:p-4"
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
            {doctorLabel(item.doctorName) ?? item.departmentName ?? 'Appointment'}
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
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
          <StatusChip status={item.status} />
          <ChevronDown
            className={cn('h-4 w-4 text-slate-400 transition-transform duration-200', open && 'rotate-180')}
          />
        </div>
      </button>

      <div
        id={detailsId}
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-4 sm:px-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail icon={Stethoscope} label="Purpose">
                {item.purpose ?? '—'}
              </Detail>
              <Detail icon={Clock} label="Scheduled">
                {formatIstDateTime(item.appointmentDate)}
              </Detail>
              {item.checkInTime ? (
                <Detail icon={LogIn} label="Checked in">
                  {formatIstDateTime(item.checkInTime)}
                </Detail>
              ) : null}
              {item.checkOutTime ? (
                <Detail icon={LogOut} label="Checked out">
                  {formatIstDateTime(item.checkOutTime)}
                  {item.totalDurationMinutes ? ` · ${item.totalDurationMinutes} min` : ''}
                </Detail>
              ) : null}
            </div>

            {item.doctorFeedback ? (
              <div className="rounded-xl bg-[#4A90E2]/10 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-[#001B71]">
                  <MessageSquare className="h-4 w-4" />
                  Message from doctor
                </p>
                <p className="mt-1 text-sm text-slate-800">{item.doctorFeedback}</p>
                {item.doctorFeedbackAt ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">{formatIstDateTime(item.doctorFeedbackAt)}</p>
                ) : null}
              </div>
            ) : null}

            {item.status === 'REJECTED' && item.rejectionReason ? (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{item.rejectionReason}</p>
              </div>
            ) : null}

            {item.status === 'REQUEST_SENT' && !item.doctorFeedback ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Waiting for the doctor to review your request. Your gate pass appears here once approved.
              </p>
            ) : null}

            {hasGatePass(item) ? <GatePassButton item={item} className="w-full sm:w-auto" /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
