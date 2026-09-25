'use client';

import * as React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Package, PauseCircle, PlayCircle, RefreshCw, ScanLine, Truck } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { formatIstDateTime } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DeliveryStatusBadge } from '@/features/delivery-management/ui';

export interface ScheduledDelivery {
  id: string;
  deliveryNumber: string;
  status: string;
  goodsType?: string;
  totalBoxes?: number;
  expectedArrivalTime?: string | null;
  vendorName?: string | null;
  agentName?: string | null;
  agentPhone?: string | null;
  vehicleNumber?: string | null;
  branchName?: string | null;
  holdReason?: string | null;
  holdUntil?: string | null;
  heldAt?: string | null;
}

type Props = {
  branchId: string;
  className?: string;
};

export function TodayDeliveriesTab({ branchId, className }: Props): React.ReactElement {
  const { data, isLoading, mutate } = useSWR(
    ['/api/security/deliveries/today', branchId],
    async () => {
      const res = await apiClient.get<{ deliveries: ScheduledDelivery[]; total: number }>(
        '/api/security/deliveries/today',
        { params: { branchId } },
      );
      return res.data;
    },
    { refreshInterval: 5_000 },
  );

  const deliveries = data?.deliveries ?? [];
  const [holdTarget, setHoldTarget] = React.useState<ScheduledDelivery | null>(null);
  const [holdReason, setHoldReason] = React.useState('');
  const [holdUntil, setHoldUntil] = React.useState('');
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const submitHold = async () => {
    if (!holdTarget) return;
    const reason = holdReason.trim();
    if (!reason) {
      toast.error('Hold reason is required');
      return;
    }
    setBusyId(holdTarget.id);
    try {
      await apiClient.post(`/api/delivery/security/hold/${holdTarget.id}`, {
        reason,
        holdUntil: holdUntil.trim() || undefined,
      });
      toast.success('Delivery put on hold — parties notified');
      setHoldTarget(null);
      setHoldReason('');
      setHoldUntil('');
      await mutate();
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Could not put delivery on hold');
    } finally {
      setBusyId(null);
    }
  };

  const releaseHold = async (d: ScheduledDelivery) => {
    setBusyId(d.id);
    try {
      await apiClient.post(`/api/delivery/security/release-hold/${d.id}`);
      toast.success('Hold released — original schedule restored');
      await mutate();
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Could not release hold');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5" /> Scheduled deliveries
          </h2>
          <p className="text-sm text-muted-foreground">
            Distributor bookings appear here after scheduling. Use Hold when hospital internal
            delivery needs the dock (you will be told offline by internal staff).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading deliveries…</p>}

      {!isLoading && deliveries.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No scheduled deliveries for today.
          </CardContent>
        </Card>
      )}

      <ul className="space-y-3">
        {deliveries.map((d) => {
          const onHold = d.status === 'ON_HOLD';
          const canHold = d.status === 'SCHEDULED' || d.status === 'APPROVED';
          return (
            <li key={d.id}>
              <Card className={onHold ? 'border-rose-200 bg-rose-50/40' : undefined}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{d.deliveryNumber}</CardTitle>
                      <p className="text-sm text-muted-foreground">{d.vendorName ?? 'Vendor'}</p>
                    </div>
                    <DeliveryStatusBadge status={d.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {d.goodsType ?? 'Goods'} · {d.totalBoxes ?? 0} boxes
                  </p>
                  {d.expectedArrivalTime && (
                    <p>Arrival: {formatIstDateTime(d.expectedArrivalTime)}</p>
                  )}
                  <p>
                    Driver: {d.agentName ?? '—'}
                    {d.agentPhone ? ` · ${d.agentPhone}` : ''}
                  </p>
                  <p>Vehicle: {d.vehicleNumber ?? '—'}</p>
                  {onHold && (
                    <div className="rounded-md border border-rose-200 bg-white/80 p-2 text-rose-900">
                      <p className="font-medium">On hold — gate entry blocked</p>
                      {d.holdReason ? <p>Reason: {d.holdReason}</p> : null}
                      {d.holdUntil ? <p>Until: {formatIstDateTime(d.holdUntil)}</p> : null}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {canHold && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === d.id}
                        onClick={() => {
                          setHoldTarget(d);
                          setHoldReason('');
                          setHoldUntil('');
                        }}
                      >
                        <PauseCircle className="h-4 w-4 mr-1" /> Put on hold
                      </Button>
                    )}
                    {onHold && (
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                        disabled={busyId === d.id}
                        onClick={() => void releaseHold(d)}
                      >
                        <PlayCircle className="h-4 w-4 mr-1" /> Release hold
                      </Button>
                    )}
                    {!onHold && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/security/dashboard?tab=delivery-scan">
                          <ScanLine className="h-4 w-4 mr-1" /> Scan QR at gate
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!holdTarget} onOpenChange={(open) => !open && setHoldTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Put delivery on hold</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {holdTarget?.deliveryNumber} — {holdTarget?.vendorName}. Distributor, driver, hospital
            admin, and super admin will be notified. Original arrival time stays the same.
          </p>
          <div className="space-y-3">
            <div>
              <Label htmlFor="hold-reason">Reason (required)</Label>
              <Textarea
                id="hold-reason"
                placeholder="e.g. Internal pharmacy transfer using dock 10:00–10:45"
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="hold-until">Hold until (optional)</Label>
              <Input
                id="hold-until"
                type="datetime-local"
                value={holdUntil}
                onChange={(e) => setHoldUntil(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              disabled={!!busyId}
              onClick={() => void submitHold()}
            >
              Confirm hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
