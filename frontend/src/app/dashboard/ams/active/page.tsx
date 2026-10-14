'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useAuthSession } from '@/hooks/useAuthSession';
import {
  AttendantPassService,
  type AttendantPassRow,
} from '@/lib/services/attendantPassService';
import { AmsPageShell } from '@/features/attendant-management/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DASHBOARD_REFRESH_MS } from '@/lib/dashboard-refresh';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/mobile/EmptyState';
import { MobileListCard } from '@/components/mobile/MobileListCard';
import { StatusChip } from '@/components/mobile/StatusChip';

const WARDS = ['All', 'ICU', 'NICU', 'Emergency', 'General', 'Private', 'VIP'];

export default function AmsActivePage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string }>();
  const branchId = user?.branchId;
  const [ward, setWard] = React.useState('All');
  const [rows, setRows] = React.useState<AttendantPassRow[]>([]);

  const load = React.useCallback(async (quiet = false) => {
    if (!branchId) return;
    try {
      const items = await AttendantPassService.listActive(
        branchId,
        ward === 'All' ? undefined : ward,
      );
      setRows(items);
    } catch {
      if (!quiet) toast.error('Could not load active attendants');
    }
  }, [branchId, ward]);

  React.useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(true), DASHBOARD_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const forceCheckout = async (id: string) => {
    try {
      await AttendantPassService.forceExit(id);
      toast.success('Checked out — pass closed');
      void load();
    } catch {
      toast.error('Checkout failed');
    }
  };

  const revoke = async (id: string) => {
    try {
      await AttendantPassService.revokePass(id);
      toast.success('Pass revoked');
      void load();
    } catch {
      toast.error('Revoke failed');
    }
  };

  return (
    <AmsPageShell title="Active Attendants" subtitle="Currently inside the hospital.">
      <div className="flex flex-wrap gap-2 max-lg:-mx-4 max-lg:flex-nowrap max-lg:overflow-x-auto max-lg:px-4 max-lg:[scrollbar-width:none]">
        {WARDS.map((w) => (
          <Button
            key={w}
            size="sm"
            variant={ward === w ? 'default' : 'outline'}
            className={cn('shrink-0 max-lg:h-9 max-lg:rounded-full', ward === w && 'bg-[#0052CC]')}
            onClick={() => setWard(w)}
          >
            {w}
          </Button>
        ))}
      </div>

      <div className="space-y-2 lg:hidden">
        {rows.length === 0 ? (
          <EmptyState title="No attendants currently inside" />
        ) : (
          rows.map((row) => (
            <MobileListCard
              key={row.id}
              title={row.attendant?.name ?? '—'}
              subtitle={`${row.attendant?.admission?.patient?.name ?? '—'} · ${row.attendant?.admission?.wardName ?? '—'}`}
              status={<StatusChip status="CHECKED_IN" label="Inside" />}
              meta={[
                { label: 'Time in', value: row.enteredAt ? new Date(row.enteredAt).toLocaleString() : '—' },
                { label: 'Duration', value: `${row.durationMinutesLive ?? row.durationMinutes ?? 0} min` },
              ]}
              actions={
                <>
                  <Button size="sm" variant="outline" className="h-10 flex-1" onClick={() => void forceCheckout(row.id)}>
                    Force checkout
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 flex-1 border-red-200 text-red-700"
                    onClick={() => void revoke(row.id)}
                  >
                    Revoke
                  </Button>
                </>
              }
            />
          ))
        )}
      </div>

      <Card className="rounded-xl overflow-x-auto max-lg:hidden">
        <CardContent className="pt-4">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="py-2">Attendant</th>
                <th className="py-2">Patient</th>
                <th className="py-2">Ward</th>
                <th className="py-2">Time In</th>
                <th className="py-2">Duration</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-muted-foreground">
                    No attendants currently inside.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="py-2 font-medium">{row.attendant?.name ?? '—'}</td>
                    <td className="py-2">{row.attendant?.admission?.patient?.name ?? '—'}</td>
                    <td className="py-2">{row.attendant?.admission?.wardName ?? '—'}</td>
                    <td className="py-2">
                      {row.enteredAt ? new Date(row.enteredAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-2">{row.durationMinutesLive ?? row.durationMinutes ?? 0} min</td>
                    <td className="py-2 text-emerald-700">Inside</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => void forceCheckout(row.id)}>
                          Force checkout
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-700 border-red-200"
                          onClick={() => void revoke(row.id)}
                        >
                          Revoke
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AmsPageShell>
  );
}
