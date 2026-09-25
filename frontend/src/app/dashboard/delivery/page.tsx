'use client';

import * as React from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api';
import { useAuthSession } from '@/hooks/useAuthSession';
import { formatIstDateTime } from '@/lib/datetime';
import { DASHBOARD_REFRESH_MS } from '@/lib/dashboard-refresh';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DeliveryEmptyState,
  DeliveryKpiStrip,
  DeliveryPageShell,
  DeliveryStatusBadge,
  DELIVERY_STATUS_LABELS,
} from '@/features/delivery-management/ui';

interface DeliveryRow {
  id: string;
  deliveryNumber: string;
  status: string;
  goodsType?: string;
  totalBoxes?: number;
  expectedArrivalTime?: string | null;
  vendorName?: string | null;
  agentName?: string | null;
  vehicleNumber?: string | null;
  branchName?: string | null;
}

export default function DeliveryDashboardPage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string; role?: string }>();
  const branchId = user?.branchId;
  const [summary, setSummary] = React.useState<{ total: number; byStatus: Record<string, number> }>(
    { total: 0, byStatus: {} },
  );
  const [deliveries, setDeliveries] = React.useState<DeliveryRow[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [search, setSearch] = React.useState('');

  const load = React.useCallback(() => {
    const params = user?.role === 'SUPER_ADMIN' ? {} : { branchId };
    apiClient
      .get('/api/delivery/deliveries', { params: { ...params, limit: 100 } })
      .then((res) => setDeliveries(res.data.items ?? []))
      .catch(() => {
        setDeliveries([]);
      });
    if (branchId || user?.role === 'SUPER_ADMIN') {
      apiClient
        .get('/api/delivery/deliveries/dashboard/summary', {
          params: branchId ? { branchId } : {},
        })
        .then((res) =>
          setSummary({ total: res.data.total ?? 0, byStatus: res.data.byStatus ?? {} }),
        )
        .catch(() => setSummary({ total: 0, byStatus: {} }));
    }
  }, [branchId, user?.role]);

  React.useEffect(() => {
    load();
    const id = window.setInterval(load, DASHBOARD_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const filtered = deliveries.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.deliveryNumber.toLowerCase().includes(q) ||
      (d.vendorName ?? '').toLowerCase().includes(q) ||
      (d.goodsType ?? '').toLowerCase().includes(q)
    );
  });

  const statusOptions = Object.keys(summary.byStatus);

  return (
    <DeliveryPageShell
      title="Delivery operations"
      subtitle="Monitor inbound distributor deliveries for your hospital."
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/delivery-slots">Slots</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/delivery/vendors">Vendors</Link>
          </Button>
        </>
      }
    >
      <DeliveryKpiStrip total={summary.total} byStatus={summary.byStatus} />

      <Card className="border-amber-100/80 bg-white/90">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Deliveries</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search number, vendor, goods…"
              className="w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {DELIVERY_STATUS_LABELS[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <DeliveryEmptyState
              title="No deliveries match"
              description="Bookings from approved distributors will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Number</th>
                    <th className="py-2 pr-3">Vendor</th>
                    <th className="py-2 pr-3">Goods</th>
                    <th className="py-2 pr-3">Arrival</th>
                    <th className="py-2 pr-3">Driver / vehicle</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((d) => (
                    <tr key={d.id} className="hover:bg-amber-50/40">
                      <td className="py-3 pr-3">
                        <Link
                          href={`/dashboard/delivery/${d.id}`}
                          className="font-medium text-teal-800 underline-offset-2 hover:underline"
                        >
                          {d.deliveryNumber}
                        </Link>
                      </td>
                      <td className="py-3 pr-3">{d.vendorName ?? '—'}</td>
                      <td className="py-3 pr-3">
                        {d.goodsType ?? '—'}
                        {d.totalBoxes != null ? ` (${d.totalBoxes})` : ''}
                      </td>
                      <td className="py-3 pr-3">
                        {d.expectedArrivalTime
                          ? formatIstDateTime(d.expectedArrivalTime)
                          : '—'}
                      </td>
                      <td className="py-3 pr-3">
                        {d.agentName ?? '—'} / {d.vehicleNumber ?? '—'}
                      </td>
                      <td className="py-3">
                        <DeliveryStatusBadge status={d.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DeliveryPageShell>
  );
}
