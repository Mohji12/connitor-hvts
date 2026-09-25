'use client';

import * as React from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { IdCard, RefreshCw, Search } from 'lucide-react';
import {
  VisitorPassService,
  type VisitorPassRow,
} from '@/lib/services/visitorPassService';
import { todayIstDateIso, formatIstDateTime } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

type Props = {
  branchId: string;
  className?: string;
  refreshKey?: number;
};

const REFRESH_MS = 5_000;

export function VisitorPassesTab({ className, refreshKey = 0 }: Props): React.ReactElement {
  const [date, setDate] = React.useState(todayIstDateIso());
  const [query, setQuery] = React.useState('');
  const [assignRow, setAssignRow] = React.useState<VisitorPassRow | null>(null);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [purpose, setPurpose] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const { data, isLoading, mutate } = useSWR(
    ['/api/security/visitor-passes', date, query, refreshKey],
    () => VisitorPassService.listForSecurity({ date, q: query || undefined }),
    { refreshInterval: REFRESH_MS },
  );

  const assignPass = async () => {
    if (!assignRow) return;
    setSaving(true);
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
      void mutate();
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Could not assign pass');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={className} data-testid="visitor-passes-tab">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <IdCard className="h-5 w-5" /> Visitor passes
          </h2>
          <p className="text-sm text-muted-foreground">
            Hospital-issued IDs for this location, including unused. Search by pass ID or visitor
            name.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void mutate()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <Card>
          <CardContent className="py-3 text-sm">
            Remaining unused{' '}
            <strong>
              {data?.unused ?? 0}/{data?.allotted ?? 0}
            </strong>
            <span className="block text-xs text-muted-foreground">
              Quota {data?.dailyQuota ?? '—'}
            </span>
          </CardContent>
        </Card>
        <div className="space-y-1.5">
          <Label htmlFor="security-pass-date">Date</Label>
          <Input
            id="security-pass-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="security-pass-search">Search pass ID</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              id="security-pass-search"
              className="pl-8"
              placeholder="ELC-260816-0042 or visitor name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {assignRow ? (
        <Card className="mb-4 border-[#001B71]/20">
          <CardContent className="py-4 space-y-2">
            <p className="text-sm font-medium">
              Assign unused pass <span className="font-mono">{assignRow.passId}</span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              <Input placeholder="10-digit phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input placeholder="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={saving} onClick={() => void assignPass()}>
                Assign
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAssignRow(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isLoading && <p className="text-sm text-muted-foreground">Loading visitor passes...</p>}

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
        {!isLoading && (data?.items ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No hospital-issued pass IDs for this date.
          </p>
        )}
      </div>
    </div>
  );
}
