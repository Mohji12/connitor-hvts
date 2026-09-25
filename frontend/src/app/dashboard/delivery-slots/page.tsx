'use client';

import * as React from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { useAuthSession } from '@/hooks/useAuthSession';
import { formatIstDateTime, todayIstDateIso } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeliveryEmptyState, DeliveryPageShell } from '@/features/delivery-management/ui';

interface SlotRow {
  id: string;
  slotStart: string;
  slotEnd: string;
  capacityMinutes?: number;
  bookedMinutes?: number;
  remainingMinutes?: number;
  maxDeliveries: number;
  bookedCount: number;
  remaining: number;
  isActive: boolean;
}

export default function DeliverySlotsPage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string }>();
  const branchId = user?.branchId ?? '';
  const [viewDate, setViewDate] = React.useState(todayIstDateIso());
  const [startDate, setStartDate] = React.useState(todayIstDateIso());
  const [endDate, setEndDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [windowStart, setWindowStart] = React.useState('10:00');
  const [windowEnd, setWindowEnd] = React.useState('12:00');
  const [afternoonStart, setAfternoonStart] = React.useState('14:00');
  const [afternoonEnd, setAfternoonEnd] = React.useState('16:00');
  const [includeAfternoon, setIncludeAfternoon] = React.useState(true);
  const [allowUnscheduled, setAllowUnscheduled] = React.useState(true);
  const [slots, setSlots] = React.useState<SlotRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadSlots = React.useCallback(async () => {
    if (!branchId || !viewDate) return;
    try {
      const res = await apiClient.get(`/api/delivery/branches/${branchId}/slots`, {
        params: { date: viewDate, includeFull: true },
      });
      setSlots(res.data.slots ?? []);
    } catch {
      setSlots([]);
    }
  }, [branchId, viewDate]);

  React.useEffect(() => {
    if (!branchId) return;
    apiClient
      .get(`/api/delivery/branch-settings/${branchId}`)
      .then((res) => setAllowUnscheduled(res.data.allowUnscheduledDeliveries ?? true))
      .catch(() => undefined);
  }, [branchId]);

  React.useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const generateWindows = async () => {
    if (!branchId) {
      toast.error('No branch assigned');
      return;
    }
    const windows = [{ start: windowStart, end: windowEnd }];
    if (includeAfternoon) {
      windows.push({ start: afternoonStart, end: afternoonEnd });
    }
    setLoading(true);
    try {
      const res = await apiClient.post(`/api/delivery/branches/${branchId}/slots`, {
        startDate,
        endDate,
        mode: 'windows',
        maxDeliveries: 999,
        windows,
      });
      toast.success(`Created ${res.data.created} delivery window(s)`, {
        description: 'Distributors share remaining minutes inside each window.',
      });
      await loadSlots();
    } catch {
      toast.error('Failed to create delivery windows');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!branchId) return;
    try {
      await apiClient.put(`/api/delivery/branch-settings/${branchId}`, {
        allowUnscheduledDeliveries: allowUnscheduled,
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  return (
    <DeliveryPageShell
      title="Delivery time windows"
      subtitle="Publish multi-hour receiving windows. Each distributor books only the unload minutes they need; leftover time stays available."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-amber-100 bg-white/90">
          <CardHeader>
            <CardTitle>Create windows</CardTitle>
            <CardDescription>
              Example: a 2-hour window (10:00–12:00). A 10-min delivery uses 10 minutes; 110 minutes
              remain for others.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>From date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>To date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Morning start</Label>
                <Input
                  type="time"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                />
              </div>
              <div>
                <Label>Morning end</Label>
                <Input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeAfternoon}
                onChange={(e) => setIncludeAfternoon(e.target.checked)}
              />
              Also create afternoon window
            </label>
            {includeAfternoon && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Afternoon start</Label>
                  <Input
                    type="time"
                    value={afternoonStart}
                    onChange={(e) => setAfternoonStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Afternoon end</Label>
                  <Input
                    type="time"
                    value={afternoonEnd}
                    onChange={(e) => setAfternoonEnd(e.target.value)}
                  />
                </div>
              </div>
            )}
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              disabled={loading}
              onClick={() => void generateWindows()}
            >
              {loading ? 'Creating…' : 'Publish windows'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-teal-100 bg-white/90">
          <CardHeader>
            <CardTitle>Branch policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowUnscheduled}
                onChange={(e) => setAllowUnscheduled(e.target.checked)}
              />
              Allow unscheduled deliveries
            </label>
            <Button variant="outline" onClick={() => void saveSettings()}>
              Save settings
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-100 bg-white/90">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Day schedule</CardTitle>
            <CardDescription>Minute pool remaining in each window</CardDescription>
          </div>
          <Input
            type="date"
            className="w-44"
            value={viewDate}
            onChange={(e) => setViewDate(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          {slots.length === 0 ? (
            <DeliveryEmptyState
              title="No windows for this day"
              description="Publish a date range above to create receiving windows."
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {slots.map((s) => {
                const capacity = s.capacityMinutes ?? s.maxDeliveries;
                const remaining = s.remainingMinutes ?? s.remaining;
                const booked = s.bookedMinutes ?? 0;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm"
                  >
                    <span>
                      {formatIstDateTime(s.slotStart)} – {formatIstDateTime(s.slotEnd)}
                    </span>
                    <span className="text-right font-medium text-teal-800">
                      {remaining}/{capacity} min left
                      <span className="block text-xs font-normal text-muted-foreground">
                        {s.bookedCount} booking(s) · {booked} min used
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </DeliveryPageShell>
  );
}
