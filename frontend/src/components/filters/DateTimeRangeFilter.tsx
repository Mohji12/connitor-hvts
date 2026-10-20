'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { todayIstDateIso } from '@/lib/datetime';
import { cn } from '@/lib/utils';

export type DateTimeRange = { fromTime: string; toTime: string };

function splitWallTime(value: string): { date: string; clock: string } {
  const [date = todayIstDateIso(), clock = '00:00'] = value.split('T');
  return { date, clock: clock.slice(0, 5) };
}

export function DateTimeRangeFilter({
  value,
  onApply,
  className,
  idPrefix = 'range',
  minDate,
  maxDate,
}: {
  value: DateTimeRange;
  onApply: (range: DateTimeRange) => void;
  className?: string;
  idPrefix?: string;
  minDate?: string;
  maxDate?: string;
}): React.ReactElement {
  const fromParts = splitWallTime(value.fromTime);
  const toParts = splitWallTime(value.toTime);
  const [fromDate, setFromDate] = React.useState(fromParts.date);
  const [fromClock, setFromClock] = React.useState(fromParts.clock);
  const [toDate, setToDate] = React.useState(toParts.date);
  const [toClock, setToClock] = React.useState(toParts.clock);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const nextFrom = splitWallTime(value.fromTime);
    const nextTo = splitWallTime(value.toTime);
    setFromDate(nextFrom.date);
    setFromClock(nextFrom.clock);
    setToDate(nextTo.date);
    setToClock(nextTo.clock);
  }, [value.fromTime, value.toTime]);

  const apply = () => {
    if (!fromDate || !toDate) {
      setError('Choose a start and end date');
      return;
    }
    const fromTime = `${fromDate}T${fromClock || '00:00'}`;
    const toTime = `${toDate}T${toClock || '23:59'}`;
    if (fromTime > toTime) {
      setError('Start must be before end');
      return;
    }
    setError(null);
    onApply({ fromTime, toTime });
  };

  return (
    <div className={cn('grid min-w-0 w-full grid-cols-1 gap-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end', className)}>
      <div className="min-w-0 space-y-1">
        <Label htmlFor={`${idPrefix}-from-date`} className="text-xs">
          Start date
        </Label>
        <Input
          id={`${idPrefix}-from-date`}
          type="date"
          value={fromDate}
          min={minDate}
          max={maxDate}
          onChange={(event) => setFromDate(event.target.value)}
        />
      </div>
      <div className="min-w-0 space-y-1">
        <Label htmlFor={`${idPrefix}-from-time`} className="text-xs">
          Start time
        </Label>
        <Input
          id={`${idPrefix}-from-time`}
          type="time"
          value={fromClock}
          onChange={(event) => setFromClock(event.target.value)}
        />
      </div>
      <div className="min-w-0 space-y-1">
        <Label htmlFor={`${idPrefix}-to-date`} className="text-xs">
          End date
        </Label>
        <Input
          id={`${idPrefix}-to-date`}
          type="date"
          value={toDate}
          min={fromDate || minDate}
          max={maxDate}
          onChange={(event) => setToDate(event.target.value)}
        />
      </div>
      <div className="min-w-0 space-y-1">
        <Label htmlFor={`${idPrefix}-to-time`} className="text-xs">
          End time
        </Label>
        <Input
          id={`${idPrefix}-to-time`}
          type="time"
          value={toClock}
          onChange={(event) => setToClock(event.target.value)}
        />
      </div>
      <Button type="button" size="sm" className="h-9" onClick={apply}>
        Apply
      </Button>
      {error ? <p className="text-xs text-red-600 lg:col-span-5">{error}</p> : null}
    </div>
  );
}
