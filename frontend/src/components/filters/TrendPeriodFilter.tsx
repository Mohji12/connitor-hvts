'use client';

import * as React from 'react';
import { CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { nowIstTimeValue, todayIstDateIso } from '@/lib/datetime';
import type { TrendPeriod } from '@/lib/services/analyticsService';
import { cn } from '@/lib/utils';

export type TrendFilterMode = TrendPeriod | 'custom';

export type TrendRange = { fromTime: string; toTime: string };

export function useTrendFilter(initial: TrendPeriod = 'weekly'): {
  period: TrendFilterMode;
  range: TrendRange | undefined;
  onPeriodChange: (period: TrendPeriod) => void;
  onRangeApply: (range: TrendRange) => void;
} {
  const [period, setPeriod] = React.useState<TrendFilterMode>(initial);
  const [range, setRange] = React.useState<TrendRange | undefined>(undefined);

  const onPeriodChange = React.useCallback((next: TrendPeriod) => {
    setPeriod(next);
    setRange(undefined);
  }, []);

  const onRangeApply = React.useCallback((next: TrendRange) => {
    setPeriod('custom');
    setRange(next);
  }, []);

  return { period, range, onPeriodChange, onRangeApply };
}

const LABELS: Record<TrendPeriod, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export function TrendPeriodFilter({
  periods,
  period,
  onPeriodChange,
  onRangeApply,
  className,
  idPrefix = 'trend',
}: {
  periods: TrendPeriod[];
  period: TrendFilterMode;
  onPeriodChange: (period: TrendPeriod) => void;
  onRangeApply: (range: TrendRange) => void;
  className?: string;
  idPrefix?: string;
}): React.ReactElement {
  const today = todayIstDateIso();
  const [fromDate, setFromDate] = React.useState(today);
  const [fromClock, setFromClock] = React.useState('00:00');
  const [toDate, setToDate] = React.useState(today);
  const [toClock, setToClock] = React.useState(nowIstTimeValue());
  const [error, setError] = React.useState<string | null>(null);

  const applyCustom = () => {
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
    onRangeApply({ fromTime, toTime });
  };

  return (
    <div className={cn('flex min-w-0 w-full flex-col items-stretch gap-2 lg:items-end', className)}>
      <div className="flex flex-wrap gap-1">
        {periods.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={period === item ? 'default' : 'outline'}
            className="h-8 px-2.5 capitalize"
            onClick={() => {
              setError(null);
              onPeriodChange(item);
            }}
          >
            {LABELS[item]}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={period === 'custom' ? 'default' : 'outline'}
          className="h-8 px-2.5"
          onClick={() => applyCustom()}
        >
          <CalendarRange className="mr-1 h-3.5 w-3.5" />
          Custom
        </Button>
      </div>
      {period === 'custom' ? (
        <div className="grid w-full min-w-0 grid-cols-1 gap-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
          <div className="min-w-0 space-y-1">
            <Label htmlFor={`${idPrefix}-from-date`} className="text-xs">
              Start date
            </Label>
            <Input
              id={`${idPrefix}-from-date`}
              type="date"
              value={fromDate}
              max={today}
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
              min={fromDate}
              max={today}
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
          <Button type="button" size="sm" className="h-9" onClick={applyCustom}>
            Apply
          </Button>
          {error ? <p className="text-xs text-red-600 lg:col-span-5">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
