'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { formatIstDateTime } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeliveryPageShell, DeliveryStatusBadge } from '@/features/delivery-management/ui';

export default function HospitalDeliveryDetailPage(): React.ReactElement {
  const params = useParams();
  const id = String(params.id ?? '');
  const [delivery, setDelivery] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    if (!id) return;
    apiClient
      .get(`/api/delivery/deliveries/${id}`)
      .then((res) => setDelivery(res.data))
      .catch(() => toast.error('Could not load delivery'));
  }, [id]);

  return (
    <DeliveryPageShell
      title={String(delivery?.deliveryNumber ?? 'Delivery')}
      subtitle="Hospital delivery detail"
      actions={
        <Button asChild variant="outline">
          <Link href="/dashboard/delivery">Back</Link>
        </Button>
      }
    >
      {!delivery ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Card className="border-amber-100 bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Overview</CardTitle>
            <DeliveryStatusBadge status={String(delivery.status)} />
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Vendor:</span>{' '}
              {String(delivery.vendorName ?? '—')}
            </p>
            <p>
              <span className="text-muted-foreground">Goods:</span>{' '}
              {String(delivery.goodsType ?? '—')} ({String(delivery.totalBoxes ?? 0)} boxes)
            </p>
            <p>
              <span className="text-muted-foreground">Arrival:</span>{' '}
              {delivery.expectedArrivalTime
                ? formatIstDateTime(String(delivery.expectedArrivalTime))
                : '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Driver:</span>{' '}
              {String(delivery.agentName ?? '—')}
            </p>
            <p>
              <span className="text-muted-foreground">Vehicle:</span>{' '}
              {String(delivery.vehicleNumber ?? '—')}
            </p>
            <p>
              <span className="text-muted-foreground">Branch:</span>{' '}
              {String(delivery.branchName ?? '—')}
            </p>
            <p>
              <span className="text-muted-foreground">Gate entry:</span>{' '}
              {delivery.entryTime ? formatIstDateTime(String(delivery.entryTime)) : '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Gate exit:</span>{' '}
              {delivery.exitTime ? formatIstDateTime(String(delivery.exitTime)) : '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Time inside:</span>{' '}
              {delivery.durationMinutes != null ? `${String(delivery.durationMinutes)} min` : '—'}
            </p>
          </CardContent>
        </Card>
      )}
    </DeliveryPageShell>
  );
}
