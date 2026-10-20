'use client';

import * as React from 'react';
import Link from 'next/link';
import { Package, Plus, UserCircle, Users, Wallet } from 'lucide-react';
import { EmptyState } from '@/components/mobile/EmptyState';
import { MobileListCard } from '@/components/mobile/MobileListCard';
import { toast } from 'sonner';
import { useAuthSession } from '@/hooks/useAuthSession';
import {
  DistributorDeliveryService,
  type DeliveryListItem,
  type DistributorDeliveryAnalytics,
} from '@/lib/services/distributorDeliveryService';
import { DistributorDeliveryAnalytics as DeliveryAnalyticsPanel } from '@/features/delivery-management/DistributorDeliveryAnalytics';
import { formatIstDateTime } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DeliveryEmptyState,
  DeliveryPageShell,
  DeliveryStatusBadge,
} from '@/features/delivery-management/ui';

export default function VendorDeliveriesPage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string; distributorId?: string }>();
  const [items, setItems] = React.useState<DeliveryListItem[]>([]);
  const [summary, setSummary] = React.useState<DistributorDeliveryAnalytics | null>(null);
  const [walletBalance, setWalletBalance] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [list, sum] = await Promise.all([
        DistributorDeliveryService.listDeliveries({ limit: 50 }),
        DistributorDeliveryService.getSummary(user?.branchId),
      ]);
      setItems(list.items ?? []);
      setSummary(sum);
    } catch {
      toast.error('Could not load deliveries');
    }
  }, [user?.branchId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!user?.distributorId) return;
    DistributorDeliveryService.getWallet(user.distributorId)
      .then((w) => setWalletBalance(w.balance))
      .catch(() => setWalletBalance(null));
  }, [user?.distributorId]);

  return (
    <DeliveryPageShell
      title="My deliveries"
      subtitle="Delivery analytics for your bookings, plus live status for each trip."
      actions={
        <>
          <Button asChild variant="outline">
            <Link href="/vendor/profile">
              <UserCircle className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/vendor/wallet">
              <Wallet className="mr-2 h-4 w-4" />
              {walletBalance != null ? `Wallet ₹${walletBalance.toFixed(0)}` : 'Wallet'}
            </Link>
          </Button>
          <Button asChild variant="outline" className="lg:hidden">
            <Link href="/vendor/fleet">
              <Users className="mr-2 h-4 w-4" />
              Fleet
            </Link>
          </Button>
          <Button asChild className="max-lg:hidden">
            <Link href="/vendor/deliveries/book">
              <Plus className="mr-2 h-4 w-4" />
              Book delivery
            </Link>
          </Button>
        </>
      }
    >
      {summary ? <DeliveryAnalyticsPanel data={summary} /> : null}

      <ul className="space-y-2 pb-20 lg:hidden">
        {items.map((d) => (
          <li key={d.id}>
            <MobileListCard
              href={`/vendor/deliveries/${d.id}`}
              title={d.deliveryNumber}
              subtitle={
                <>
                  {d.goodsType ?? 'Goods'}
                  {d.totalBoxes != null ? ` · ${d.totalBoxes} boxes` : ''}
                  {d.status === 'ON_HOLD' && d.holdReason ? (
                    <span className="mt-1 block text-rose-800">On hold: {d.holdReason}</span>
                  ) : null}
                </>
              }
              status={<DeliveryStatusBadge status={d.status} />}
              meta={[
                { label: 'Hospital', value: d.branchName ?? '—' },
                {
                  label: 'Arrival',
                  value: d.expectedArrivalTime ? formatIstDateTime(d.expectedArrivalTime) : '—',
                },
              ]}
            />
          </li>
        ))}
      </ul>
      {items.length === 0 ? (
        <EmptyState
          className="lg:hidden"
          icon={Package}
          title="No deliveries yet"
          description="Book a hospital delivery to get started. Your driver will get the gate QR by email."
        />
      ) : null}

      <Link
        href="/vendor/deliveries/book"
        aria-label="Book delivery"
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 lg:hidden"
      >
        <Plus className="h-5 w-5" />
        Book
      </Link>

      <Card className="border-[#001B71]/08 bg-white/90 shadow-sm max-lg:hidden">
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
