'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useAuthSession } from '@/hooks/useAuthSession';
import {
  AttendantPassService,
  type AttendantPassRow,
} from '@/lib/services/attendantPassService';
import { AmsPageShell, AmsQrPassCard } from '@/features/attendant-management/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DASHBOARD_REFRESH_MS } from '@/lib/dashboard-refresh';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FILTERS = ['All', 'Inside', 'Exited', 'Used', 'Expired', 'Cancelled', 'Today'];

export default function AmsSearchPage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string }>();
  const branchId = user?.branchId;
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState('All');
  const [rows, setRows] = React.useState<AttendantPassRow[]>([]);
  const [selected, setSelected] = React.useState<AttendantPassRow | null>(null);
  const [extendTo, setExtendTo] = React.useState('');

  const load = React.useCallback(async (quiet = false) => {
    if (!branchId) return;
    try {
      const items = await AttendantPassService.search(
        branchId,
        q.trim() || undefined,
        status === 'All' ? undefined : status,
      );
      setRows(items);
    } catch {
      if (!quiet) toast.error('Search failed');
    }
  }, [branchId, q, status]);

  React.useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(true), DASHBOARD_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <AmsPageShell title="Search Attendant" subtitle="Find passes by mobile, MRN, name, or pass ID.">
      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-sm"
          placeholder="Mobile / UHID / name / pass ID"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="bg-[#0052CC]" onClick={() => void load()}>
          Search
        </Button>
      </div>

      <Card className="rounded-xl overflow-x-auto">
        <CardContent className="pt-4">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Patient</th>
                <th className="py-2">Ward</th>
                <th className="py-2">Relationship</th>
                <th className="py-2">Entry</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2 font-medium">{row.attendant?.name ?? '—'}</td>
                  <td className="py-2">{row.attendant?.admission?.patient?.name ?? '—'}</td>
                  <td className="py-2">{row.attendant?.admission?.wardName ?? '—'}</td>
                  <td className="py-2">{row.attendant?.relationship ?? '—'}</td>
                  <td className="py-2">
                    {row.enteredAt ? new Date(row.enteredAt).toLocaleString() : '—'}
                  </td>
                  <td className="py-2">
                    {row.isInside ? 'Inside' : row.status}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => setSelected(row)}>
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const to =
                            extendTo ||
                            new Date(Date.now() + 24 * 3600 * 1000).toISOString();
                          try {
                            await AttendantPassService.extendPass(row.id, to);
                            toast.success('Pass extended');
                            void load();
                          } catch {
                            toast.error('Extend failed');
                          }
                        }}
                      >
                        Extend
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-700 border-red-200"
                        disabled={row.status !== 'ACTIVE'}
                        onClick={async () => {
                          try {
                            await AttendantPassService.revokePass(row.id);
                            toast.success('Pass revoked — no longer active');
                            void load();
                          } catch {
                            toast.error('Revoke failed');
                          }
                        }}
                      >
                        Revoke
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await AttendantPassService.suspendPass(row.id);
                            toast.success('Pass suspended');
                            void load();
                          } catch {
                            toast.error('Suspend failed');
                          }
                        }}
                      >
                        Suspend
                      </Button>
                      {row.isInside && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await AttendantPassService.forceExit(row.id);
                              toast.success('Checked out — pass closed');
                              void load();
                            } catch {
                              toast.error('Exit failed');
                            }
                          }}
                        >
                          Force checkout
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => window.print()}>
                        Print
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 max-w-xs">
            <Label>Extend until (optional ISO / datetime)</Label>
            <Input
              type="datetime-local"
              value={extendTo}
              onChange={(e) => setExtendTo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {selected && (
        <AmsQrPassCard
          passNumber={selected.passNumber}
          attendantName={selected.attendant?.name ?? '—'}
          patientName={selected.attendant?.admission?.patient?.name ?? '—'}
          ward={selected.attendant?.admission?.wardName}
          bed={selected.attendant?.admission?.bedNumber}
          validTo={selected.validTo ?? selected.expiresAt}
          status={selected.status}
          qrPayload={selected.qrPayload}
          qrSignature={selected.qrSignature}
        />
      )}
    </AmsPageShell>
  );
}
