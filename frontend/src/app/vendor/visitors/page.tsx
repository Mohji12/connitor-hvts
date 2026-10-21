'use client';

import * as React from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/mobile/EmptyState';
import { StatusChip } from '@/components/mobile/StatusChip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { DeliveryPageShell } from '@/features/delivery-management/ui';
import { formatIstDateTime } from '@/lib/datetime';
import { getApiErrorMessage } from '@/lib/api-errors';
import {
  DistributorVisitService,
  type DistributorVisitRecord,
} from '@/lib/services/distributorVisitService';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'REQUEST_SENT', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
] as const;

export default function VendorVisitorsPage(): React.ReactElement {
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]['value']>('all');
  const [items, setItems] = React.useState<DistributorVisitRecord[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const rows = await DistributorVisitService.listVendorVisits(
        filter === 'all' ? undefined : filter,
      );
      setItems(rows);
      setSelectedId((current) => current ?? rows[0]?.id ?? null);
    } catch {
      toast.error('Could not load visitor requests');
    }
  }, [filter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  async function approve(): Promise<void> {
    if (!selected) return;
    setBusy(true);
    try {
      const next = await DistributorVisitService.approveVisit(selected.id);
      toast.success('Visit approved. Meeting pass issued.');
      setItems((rows) => rows.map((row) => (row.id === next.id ? next : row)));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not approve this visit'));
    } finally {
      setBusy(false);
    }
  }

  async function reject(): Promise<void> {
    if (!selected) return;
    setBusy(true);
    try {
      const next = await DistributorVisitService.rejectVisit(selected.id, reason.trim() || undefined);
      toast.success('Visit rejected. The slot is free again.');
      setItems((rows) => rows.map((row) => (row.id === next.id ? next : row)));
      setReason('');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not reject this visit'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeliveryPageShell
      title="Visitors"
      subtitle="Approve office visits and issue a meeting pass. These are not hospital gate visits."
    >
      <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
        <TabsList className="h-10 bg-slate-100">
          {FILTERS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {items.length === 0 ? (
        <EmptyState
          title="No visitor requests"
          description="When a visitor books a slot at your office, it appears here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-2xl border bg-white p-4 text-left ${
                  selectedId === item.id ? 'border-[#001B71] ring-1 ring-[#001B71]/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.visitorName || 'Visitor'}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {item.companyName || item.visitorPhone || '—'}
                    </p>
                    <p className="mt-1 text-xs text-[#1d5fae]">{formatIstDateTime(item.appointmentDate)}</p>
                  </div>
                  <StatusChip status={item.status} />
                </div>
              </button>
            ))}
          </div>

          {selected ? (
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">{selected.visitorName || 'Visitor'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Company:</span> {selected.companyName || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Phone:</span> {selected.visitorPhone || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">When:</span> {formatIstDateTime(selected.appointmentDate)}
                </p>
                <p>
                  <span className="text-muted-foreground">Purpose:</span> {selected.purpose || '—'}
                </p>
                {selected.status === 'REQUEST_SENT' ? (
                  <div className="space-y-2 pt-2">
                    <Textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Optional reject reason"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button className="flex-1" disabled={busy} onClick={() => void approve()}>
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        className="flex-1"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void reject()}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : null}
                {selected.checkInQrCode ? (
                  <div className="rounded-xl border bg-emerald-50 p-3 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selected.checkInQrCode}
                      alt="Meeting pass QR"
                      className="mx-auto aspect-square w-full max-w-48 object-contain"
                    />
                    {selected.checkInOtp ? (
                      <p className="mt-2 font-mono text-lg font-bold tracking-widest">{selected.checkInOtp}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-emerald-900">Show this pass at your desk. Not a hospital gate pass.</p>
                  </div>
                ) : null}
                {selected.rejectionReason ? (
                  <p className="rounded-lg bg-red-50 p-3 text-red-800">{selected.rejectionReason}</p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </DeliveryPageShell>
  );
}
