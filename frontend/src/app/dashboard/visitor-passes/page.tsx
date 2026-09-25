'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Ticket } from 'lucide-react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { todayIstDateIso, formatIstDateTime } from '@/lib/datetime';
import {
  VisitorPassService,
  type VisitorPassList,
  type VisitorPassRow,
} from '@/lib/services/visitorPassService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function VisitorPassesPage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string; role?: string }>();
  const branchId = user?.branchId ?? '';
  const [date, setDate] = React.useState(todayIstDateIso());
  const [quota, setQuota] = React.useState(50);
  const [data, setData] = React.useState<VisitorPassList | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [assignRow, setAssignRow] = React.useState<VisitorPassRow | null>(null);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [purpose, setPurpose] = React.useState('');

  const load = React.useCallback(async () => {
    if (!branchId) return;
    try {
      const [policy, list] = await Promise.all([
        VisitorPassService.getPolicy(branchId),
        VisitorPassService.list(branchId, { date }),
      ]);
      setQuota(policy.dailyQuota);
      setData(list);
    } catch {
      setData(null);
      toast.error('Could not load visitor passes');
    }
  }, [branchId, date]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const saveQuota = async () => {
    if (!branchId) return;
    try {
      const res = await VisitorPassService.updatePolicy(branchId, quota);
      setQuota(res.dailyQuota);
      toast.success('Daily quota saved');
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Could not save quota');
    }
  };

  const issuePool = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await VisitorPassService.issue(branchId, { date });
      toast.success(`Issued ${res.created} pass ID(s)`);
      await load();
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Could not issue pass pool');
    } finally {
      setLoading(false);
    }
  };

  const assignPass = async () => {
    if (!assignRow) return;
    setLoading(true);
    try {
      await VisitorPassService.assign(assignRow.passId, {
        firstName,
        lastName,
        phone,
        purpose,
      });
      toast.success(`Assigned ${assignRow.passId}`);
      setAssignRow(null);
      setFirstName('');
      setLastName('');
      setPhone('');
      setPurpose('');
      await load();
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Could not assign pass');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ticket className="h-6 w-6 text-teal-700" />
          Visitor passes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hospital management issues unique pass IDs for the day. Doctor confirmation assigns one
          unused ID (remaining unused drops). Issued / quota stays the same until you raise quota
          and top up.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily quota</CardTitle>
            <CardDescription>Maximum pass IDs for this location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="quota">Passes / day</Label>
              <Input
                id="quota"
                type="number"
                min={1}
                max={5000}
                value={quota}
                onChange={(e) => setQuota(Number(e.target.value) || 1)}
              />
            </div>
            <Button onClick={() => void saveQuota()} variant="outline" className="w-full">
              Save quota
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s pool</CardTitle>
            <CardDescription>{data?.date ?? date}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Remaining unused: <strong>{data?.unused ?? 0}</strong> / {data?.allotted ?? 0}
            </p>
            <p>
              Assigned: <strong>{data?.assigned ?? 0}</strong>
            </p>
            <p>
              Issued this day: {data?.allotted ?? 0} / quota {data?.dailyQuota ?? quota}
            </p>
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="pass-date">Date</Label>
              <Input id="pass-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <Button className="w-full" disabled={loading} onClick={() => void issuePool()}>
              Generate / top-up pool
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assign unused pass</CardTitle>
            <CardDescription>Walk-in without a doctor booking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignRow ? (
              <>
                <p className="text-sm font-mono">{assignRow.passId}</p>
                <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                <Input placeholder="10-digit phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input placeholder="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void assignPass()} disabled={loading}>
                    Assign
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAssignRow(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Choose an unused pass from the table to attach a visitor.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issued pass IDs</CardTitle>
          <CardDescription>All hospital-generated IDs for this date (assigned and unused)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-3">Pass ID</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Visitor</th>
                  <th className="py-2 pr-3">Doctor / slot</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-mono font-medium">{row.passId}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={row.status === 'UNASSIGNED' ? 'outline' : 'default'}>
                        {row.status === 'UNASSIGNED' ? 'Unused' : 'Assigned'}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3">
                      {row.visitorName ?? '—'}
                      {row.visitorPhone ? (
                        <span className="block text-xs text-muted-foreground">{row.visitorPhone}</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3">
                      {row.doctorName ?? '—'}
                      {row.appointmentDate ? (
                        <span className="block text-xs text-muted-foreground">
                          {formatIstDateTime(row.appointmentDate)}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2">
                      {row.status === 'UNASSIGNED' ? (
                        <Button size="sm" variant="outline" onClick={() => setAssignRow(row)}>
                          Assign visitor
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">{row.purpose ?? ''}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.items ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No pass IDs issued for this date yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
