'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/mobile/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeliveryPageShell } from '@/features/delivery-management/ui';
import { todayIstDateIso } from '@/lib/datetime';
import { getApiErrorMessage } from '@/lib/api-errors';
import {
  DistributorVisitService,
  type DistributorVisitSlot,
} from '@/lib/services/distributorVisitService';

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatRange(slot: DistributorVisitSlot): string {
  const start = new Date(slot.slotStart);
  const end = new Date(slot.slotEnd);
  const time = (value: Date) =>
    new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(value);
  const day = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(start);
  return `${day} · ${time(start)} – ${time(end)}`;
}

export default function VendorVisitSlotsPage(): React.ReactElement {
  const [date, setDate] = React.useState(todayIstDateIso);
  const [startTime, setStartTime] = React.useState('10:00');
  const [endTime, setEndTime] = React.useState('10:30');
  const [items, setItems] = React.useState<DistributorVisitSlot[]>([]);
  const [saving, setSaving] = React.useState(false);

  const from = todayIstDateIso();
  const to = addDays(from, 21);

  const load = React.useCallback(async () => {
    try {
      const rows = await DistributorVisitService.listVendorSlots(from, to);
      setItems(rows);
    } catch {
      toast.error('Could not load visit slots');
    }
  }, [from, to]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function addSlot(): Promise<void> {
    setSaving(true);
    try {
      const result = await DistributorVisitService.createVendorSlots({ date, startTime, endTime });
      toast.success(result.created ? `Added ${result.created} slot${result.created === 1 ? '' : 's'}` : 'That window already exists');
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not add that slot'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(slot: DistributorVisitSlot): Promise<void> {
    if (slot.isBooked) {
      toast.error('Cannot delete a booked slot');
      return;
    }
    try {
      await DistributorVisitService.deleteVendorSlot(slot.id);
      setItems((rows) => rows.filter((row) => row.id !== slot.id));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not delete that slot'));
    }
  }

  return (
    <DeliveryPageShell
      title="Visit slots"
      subtitle="Publish exclusive meeting windows at your office. Visitors book one window each."
    >
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a window</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="slot-date">Date</Label>
              <Input id="slot-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="slot-start">Start</Label>
                <Input
                  id="slot-start"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slot-end">End</Label>
                <Input id="slot-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              </div>
            </div>
            <Button className="w-full" disabled={saving} onClick={() => void addSlot()}>
              <Plus className="mr-2 h-4 w-4" />
              {saving ? 'Adding…' : 'Add slot'}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {items.length === 0 ? (
            <EmptyState
              title="No visit slots yet"
              description="Add a date and time window so visitors can book a meeting at your office."
            />
          ) : (
            items.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium">{formatRange(slot)}</p>
                  <p className="text-xs text-muted-foreground">{slot.isBooked ? 'Booked' : 'Open'}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={slot.isBooked}
                  onClick={() => void remove(slot)}
                  aria-label="Delete slot"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </DeliveryPageShell>
  );
}
