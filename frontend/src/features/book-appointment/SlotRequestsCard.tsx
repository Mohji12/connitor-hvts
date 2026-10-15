'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/mobile/StatusChip';
import { AppointmentService, type SlotRequestRecord } from '@/lib/services/appointmentService';

const STATUS_LABEL: Record<SlotRequestRecord['status'], string> = {
  PENDING: 'Waiting for doctor',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const STATUS_TONE: Record<SlotRequestRecord['status'], 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

function formatWhen(req: SlotRequestRecord): string {
  const [y, m, d] = req.date.split('-').map(Number);
  const [hh, mm] = req.time.split(':').map(Number);
  const when = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  return when.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function doctorName(name: string): string {
  return `Dr. ${name.replace(/^Dr\.?\s*/i, '')}`;
}

/** Visit slots the visitor asked doctors for; hidden when there are none. */
export function SlotRequestsCard(): React.ReactElement | null {
  const { data } = useSWR('visitor-slot-requests', () => AppointmentService.listSlotRequests(), {
    refreshInterval: 15_000,
  });

  if (!data || data.length === 0) return null;
  const actionable = data.filter((req) => req.status === 'APPROVED' && !req.slotBooked).length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <CalendarClock className="h-4 w-4 text-[#1d5fae]" />
            Visit requests
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Times you asked a doctor for. We WhatsApp you when they confirm.
          </p>
        </div>
        {actionable > 0 ? (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            {actionable} ready to book
          </span>
        ) : null}
      </div>
      <ul className="mt-4 space-y-2">
        {data.map((req) => {
          const canBook = req.status === 'APPROVED' && !req.slotBooked;
          return (
            <li
              key={req.id}
              className={
                canBook
                  ? 'flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 sm:flex-row sm:items-center'
                  : 'flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center'
              }
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{doctorName(req.doctorName)}</p>
                  <StatusChip
                    status={req.status}
                    label={req.status === 'APPROVED' && req.slotBooked ? 'Booked' : STATUS_LABEL[req.status]}
                    tone={req.status === 'APPROVED' && req.slotBooked ? 'neutral' : STATUS_TONE[req.status]}
                  />
                </div>
                <p className="mt-0.5 text-sm font-medium text-[#1d5fae]">{formatWhen(req)}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {[req.branchName, req.departmentName].filter(Boolean).join(' · ')}
                  {req.purpose ? ` · ${req.purpose}` : ''}
                </p>
              </div>
              {canBook ? (
                <Button asChild size="sm" className="h-9 w-full shrink-0 bg-emerald-600 hover:bg-emerald-700 sm:w-auto">
                  <Link href={`/book-appointment/?slotRequest=${req.id}`}>
                    Book now
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
