'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { AppointmentService } from '@/lib/services/appointmentService';
import { todayIstDateIso } from '@/lib/datetime';

interface SlotCalendarProps {
  doctorId: string;
  /** Selected date as YYYY-MM-DD */
  value: string;
  onChange: (date: string) => void;
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromIso(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Month calendar where days with free doctor slots are shown in green. */
export function SlotCalendar({ doctorId, value, onChange }: SlotCalendarProps): React.ReactElement {
  const today = React.useMemo(() => fromIso(todayIstDateIso()), []);
  const selected = value ? fromIso(value) : undefined;
  const [month, setMonth] = React.useState<Date>(() => selected ?? today);
  const [availableDates, setAvailableDates] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!doctorId) return;
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    if (monthEnd < today) {
      setAvailableDates([]);
      return;
    }
    const from = monthStart < today ? today : monthStart;
    let cancelled = false;
    setLoading(true);
    AppointmentService.listAvailableDates(doctorId, toIso(from), toIso(monthEnd))
      .then((dates) => {
        if (!cancelled) setAvailableDates(dates);
      })
      .catch(() => {
        if (!cancelled) setAvailableDates([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doctorId, month, today]);

  const availableDays = React.useMemo(() => availableDates.map(fromIso), [availableDates]);

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-white">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(day) => {
            if (day) onChange(toIso(day));
          }}
          month={month}
          onMonthChange={setMonth}
          disabled={{ before: today }}
          modifiers={{ available: availableDays }}
          modifiersClassNames={{
            available:
              '[&_button]:bg-emerald-100 [&_button]:font-semibold [&_button]:text-emerald-800 [&_button:hover]:bg-emerald-200',
          }}
          className="mx-auto w-full [--cell-size:--spacing(10)]"
          classNames={{ root: 'w-full' }}
        />
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-block h-3 w-3 rounded-sm bg-emerald-100 ring-1 ring-emerald-300" />
        {loading ? 'Checking available dates…' : 'Green dates have open slots. Tap a date to see its times.'}
      </p>
    </div>
  );
}
