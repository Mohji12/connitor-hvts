'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { DistributorDeliveryService } from '@/lib/services/distributorDeliveryService';
import { formatIstDateTime } from '@/lib/datetime';
import {
  cacheDeliveryPass,
  getCachedDeliveryPass,
  qrValueFromDeliveryQr,
} from '@/lib/delivery-pass-cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeliveryPageShell, DeliveryStatusBadge } from '@/features/delivery-management/ui';

export default function VendorDeliveryDetailPage(): React.ReactElement {
  const params = useParams();
  const id = String(params.id ?? '');
  const [delivery, setDelivery] = React.useState<Record<string, unknown> | null>(null);
  const cached = id ? getCachedDeliveryPass(id) : null;

  React.useEffect(() => {
    if (!id) return;
    DistributorDeliveryService.getDelivery(id)
      .then((row: Record<string, unknown>) => {
        setDelivery(row);
        const qr = (row.qr as { qrPayload?: string; signature?: string } | null) ?? null;
        cacheDeliveryPass({
          id: String(row.id ?? id),
          deliveryNumber: String(row.deliveryNumber ?? ''),
          status: String(row.status ?? ''),
          branchName: row.branchName ? String(row.branchName) : null,
          agentName: row.agentName ? String(row.agentName) : null,
          vehicleNumber: row.vehicleNumber ? String(row.vehicleNumber) : null,
          expectedArrivalTime: row.expectedArrivalTime ? String(row.expectedArrivalTime) : null,
          qr,
        });
      })
      .catch(() => toast.error('Could not load delivery'));
  }, [id]);

  const qrValue =
    qrValueFromDeliveryQr(
      (delivery?.qr as { qrPayload?: string; signature?: string } | null | undefined) ?? undefined,
    ) ?? cached?.qrValue ?? null;

  return (
    <DeliveryPageShell
      title={String(delivery?.deliveryNumber ?? 'Delivery')}
      subtitle="Delivery details and gate status"
      actions={
        <Button asChild variant="outline">
          <Link href="/vendor/deliveries">All deliveries</Link>
        </Button>
      }
    >
      {!delivery ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-[#001B71]/08 bg-white/90">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Status</CardTitle>
              <DeliveryStatusBadge status={String(delivery.status)} />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Goods:</span>{' '}
                {String(delivery.goodsType ?? '—')} ({String(delivery.totalBoxes ?? 0)} boxes)
              </p>
              <p>
                <span className="text-muted-foreground">Arrival:</span>{' '}
                {delivery.expectedArrivalTime
                  ? formatIstDateTime(String(delivery.expectedArrivalTime))
                  : 'Unscheduled'}
              </p>
              <p>
                <span className="text-muted-foreground">Hospital:</span>{' '}
                {String(delivery.branchName ?? '—')}
              </p>
              <p>
                <span className="text-muted-foreground">Driver:</span>{' '}
                {String(delivery.agentName ?? '—')}
              </p>
              <p>
                <span className="text-muted-foreground">Vehicle:</span>{' '}
                {String(delivery.vehicleNumber ?? '—')}
              </p>
              {delivery.entryTime ? (
                <p>
                  <span className="text-muted-foreground">Gate entry:</span>{' '}
                  {formatIstDateTime(String(delivery.entryTime))}
                </p>
              ) : null}
              {delivery.exitTime ? (
                <p>
                  <span className="text-muted-foreground">Gate exit:</span>{' '}
                  {formatIstDateTime(String(delivery.exitTime))}
                </p>
              ) : null}
              {delivery.durationMinutes != null ? (
                <p>
                  <span className="text-muted-foreground">Time inside:</span>{' '}
                  {String(delivery.durationMinutes)} min
                </p>
              ) : null}
              {delivery.remarks ? (
                <p>
                  <span className="text-muted-foreground">Notes:</span> {String(delivery.remarks)}
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Card className="border-[#001B71]/08 bg-white/90">
            <CardHeader>
              <CardTitle>Gate QR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {qrValue ? (
                <>
                  <div className="mx-auto w-fit rounded-xl bg-white p-3">
                    <QRCodeSVG value={qrValue} size={220} includeMargin />
                  </div>
                  <p className="text-muted-foreground">
                    Show this QR at the hospital gate. It is also saved on this phone for offline use.
                    The driver still receives the WhatsApp pass.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No QR on this delivery yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DeliveryPageShell>
  );
}
