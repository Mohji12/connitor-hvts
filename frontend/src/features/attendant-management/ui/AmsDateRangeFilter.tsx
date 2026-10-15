'use client';

import * as React from 'react';
import { CalendarRange, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { todayIstDateIso } from '@/lib/datetime';
import { cn } from '@/lib/utils';

export type AmsRangePreset = 'today' | 'yesterday' | 'last7' | 'month' | 'custom';

/** IST wall-clock bounds sent to the API as `YYYY-MM-DDTHH:mm`; null means "today, live". */
export type AmsDateRange = { fromTime: string; toTime: string } | null;

const PRESETS: Array<{ id: AmsRangePreset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
  { id: 'custom', label: 'Custom' },
];

function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function presetRange(preset: Exclude<AmsRangePreset, 'custom'>): AmsDateRange {
  const today = todayIstDateIso();
  switch (preset) {
    case 'today':
      return null;
    case 'yesterday': {
      const day = shiftIsoDate(today, -1);
      return { fromTime: `${day}T00:00`, toTime: `${day}T23:59` };
    }
    case 'last7':
      return { fromTime: `${shiftIsoDate(today, -6)}T00:00`, toTime: `${today}T23:59` };
    case 'month':
      return { fromTime: `${today.slice(0, 8)}01T00:00`, toTime: `${today}T23:59` };
  }
}

const DISPLAY = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
});

/** Formats an IST wall time string without letting the device timezone shift it. */
export function formatIstWallTime(value: string): string {
  const [date, time = '00:00'] = value.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return DISPLAY.format(new Date(Date.UTC(y, m - 1, d, hh, mm)));
}

export function AmsDateRangeFilter({
  preset,
  onChange,
  className,
}: {
  preset: AmsRangePreset;
  onChange: (preset: AmsRangePreset, range: AmsDateRange) => void;
  className?: string;
}): React.ReactElement {
  const today = todayIstDateIso();
  const [fromDate, setFromDate] = React.useState(today);
  const [fromClock, setFromClock] = React.useState('00:00');
  const [toDate, setToDate] = React.useState(today);
  const [toClock, setToClock] = React.useState('23:59');
  const [error, setError] = React.useState<string | null>(null);

  const pick = (id: AmsRangePreset) => {
    setError(null);
    if (id === 'custom') {
      onChange('custom', {
        fromTime: `${fromDate}T${fromClock}`,
        toTime: `${toDate}T${toClock}`,
      });
      return;
    }
    onChange(id, presetRange(id));
  };

  const applyCustom = () => {
    if (!fromDate || !toDate) {
      setError('Choose both dates');
      return;
    }
    const fromTime = `${fromDate}T${fromClock || '00:00'}`;
    const toTime = `${toDate}T${toClock || '23:59'}`;
    if (fromTime > toTime) {
      setError('Start must be before end');
      return;
    }
    setError(null);
    onChange('custom', { fromTime, toTime });
  };

  return (
    <div className={cn('space-y-3 rounded-xl border border-[#0052CC]/15 bg-white p-3 shadow-sm', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <CalendarRange className="h-4 w-4 text-[#0052CC]" aria-hidden />
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => pick(item.id)}
            className={cn(
              'h-8 rounded-full border px-3 text-xs font-medium transition-colors',
              preset === item.id
                ? 'border-[#0052CC] bg-[#0052CC] text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-[#0052CC]/40 hover:bg-[#0052CC]/5',
            )}
            aria-pressed={preset === item.id}
          >
            {item.label}
          </button>
        ))}
        {preset !== 'today' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-slate-600"
            onClick={() => pick('today')}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Reset
          </Button>
        ) : null}
      </div>

      {preset === 'custom' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
          <div>
            <Label htmlFor="ams-from-date" className="text-xs">From date</Label>
            <Input
              id="ams-from-date"
              type="date"
              value={fromDate}
              max={today}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ams-from-time" className="text-xs">From time</Label>
            <Input
              id="ams-from-time"
              type="time"
              value={fromClock}
              onChange={(e) => setFromClock(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ams-to-date" className="text-xs">To date</Label>
            <Input
              id="ams-to-date"
              type="date"
              value={toDate}
              min={fromDate}
              max={today}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ams-to-time" className="text-xs">To time</Label>
            <Input
              id="ams-to-time"
              type="time"
              value={toClock}
              onChange={(e) => setToClock(e.target.value)}
            />
          </div>
          <Button type="button" className="bg-[#0052CC] hover:bg-[#0041a3]" onClick={applyCustom}>
            Apply
          </Button>
          {error ? <p className="text-xs text-red-600 sm:col-span-2 lg:col-span-5">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
