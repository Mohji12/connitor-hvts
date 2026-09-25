'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthSession } from '@/hooks/useAuthSession';
import {
  DistributorDeliveryService,
  type DeliveryListItem,
} from '@/lib/services/distributorDeliveryService';
import { formatIstDateTime } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DeliveryEmptyState,
  DeliveryKpiStrip,
  DeliveryPageShell,
  DeliveryStatusBadge,
} from '@/features/delivery-management/ui';

export default function VendorDeliveriesPage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string; distributorId?: string }>();
  const [items, setItems] = React.useState<DeliveryListItem[]>([]);
  const [summary, setSummary] = React.useState<{ total: number; byStatus: Record<string, number> }>({
    total: 0,
    byStatus: {},
  });

  const load = React.useCallback(async () => {
    try {
      const [list, sum] = await Promise.all([
        DistributorDeliveryService.listDeliveries({ limit: 50 }),
        DistributorDeliveryService.getSummary(user?.branchId),
      ]);
      setItems(list.items ?? []);
      setSummary({ total: sum.total ?? 0, byStatus: sum.byStatus ?? {} });
    } catch {
      toast.error('Could not load deliveries');
    }
  }, [user?.branchId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <DeliveryPageShell
      title="My deliveries"
      subtitle="Track bookings, drivers, and gate status. Drivers receive QR instructions by email."
      actions={
        <Button asChild>
          <Link href="/vendor/deliveries/book">
            <Plus className="mr-2 h-4 w-4" />
            Book delivery
          </Link>
        </Button>
      }
    >
      <DeliveryKpiStrip total={summary.total} byStatus={summary.byStatus} />

      <Card className="border-[#001B71]/08 bg-white/90 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent deliveries</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/vendor/fleet">Manage fleet</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <DeliveryEmptyState
              title="No deliveries yet"
              description="Book a hospital delivery to get started. Your driver will get the gate QR by email."
              actionLabel="Book delivery"
              onAction={() => {
                window.location.href = '/vendor/deliveries/book';
              }}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/vendor/deliveries/${d.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:bg-[#4A90E2]/08"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{d.deliveryNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.goodsType ?? 'Goods'}
                        {d.totalBoxes != null ? ` · ${d.totalBoxes} boxes` : ''}
                        {d.branchName ? ` · ${d.branchName}` : ''}
                        {d.expectedArrivalTime
                          ? ` · ${formatIstDateTime(d.expectedArrivalTime)}`
                          : ''}
                      </p>
                      {d.status === 'ON_HOLD' && d.holdReason ? (
                        <p className="mt-1 text-sm text-rose-800">On hold: {d.holdReason}</p>
                      ) : null}
                    </div>
                    <DeliveryStatusBadge status={d.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DeliveryPageShell>
  );
}
