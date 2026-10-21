'use client';

import * as React from 'react';
import useSWR from 'swr';
import { Calendar, Filter } from 'lucide-react';
import { AppointmentService } from '@/lib/services/appointmentService';
import { formatIstDateTime } from '@/lib/datetime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, ListSkeleton } from '@/components/mobile/EmptyState';
import { MobileListCard } from '@/components/mobile/MobileListCard';
import { StatusChip } from '@/components/mobile/StatusChip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'REQUEST_SENT', label: 'Awaiting approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'CHECKED_IN', label: 'Checked in' },
  { value: 'CHECKED_OUT', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
];

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  REQUEST_SENT: 'secondary',
  APPROVED: 'default',
  CHECKED_IN: 'default',
  CHECKED_OUT: 'outline',
  REJECTED: 'destructive',
};

export default function AppointmentsPage() {
  const [statusFilter, setStatusFilter] = React.useState('ALL');

  const swrKey =
    statusFilter === 'ALL'
      ? '/api/appointments'
      : `/api/appointments?status=${statusFilter}`;

  const { data: appointments, isLoading, mutate } = useSWR(swrKey, () =>
    AppointmentService.list(
      statusFilter === 'ALL' ? undefined : { status: statusFilter },
    ),
    { refreshInterval: 5_000 },
  );

  return (
    <div className="w-full min-w-0 space-y-4 p-4 lg:space-y-6 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-lg:hidden">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" /> Appointments
          </h1>
          <p className="text-muted-foreground text-sm">
            Scheduled doctor appointments across your scope
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] max-lg:h-11 max-lg:flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="max-lg:h-11" onClick={() => mutate()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-2 lg:hidden">
        {isLoading ? <ListSkeleton /> : null}
        {!isLoading && !appointments?.length ? (
          <EmptyState icon={Calendar} title="No appointments found" />
        ) : null}
        {appointments?.map((a) => (
          <MobileListCard
            key={a.id}
            title={a.visitor ? `${a.visitor.firstName} ${a.visitor.lastName}` : 'Visitor'}
            subtitle={`with ${a.staffName ?? 'Doctor'}`}
            status={<StatusChip status={a.status} />}
            meta={[
              { label: 'When', value: a.appointmentDate ? formatIstDateTime(a.appointmentDate) : '—' },
              { label: 'Phone', value: a.visitor?.phone ?? '—' },
              ...(a.purpose ? [{ label: 'Purpose', value: a.purpose }] : []),
            ]}
          />
        ))}
      </div>

      <Card className="max-lg:hidden">
        <CardHeader>
          <CardTitle>
            {statusFilter === 'ALL' ? 'All Appointments' : STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!isLoading && !appointments?.length && (
            <p className="text-sm text-muted-foreground">No appointments found.</p>
          )}
          <ul className="space-y-3">
            {appointments?.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {a.visitor
                      ? `${a.visitor.firstName} ${a.visitor.lastName}`
                      : 'Visitor'}{' '}
                    → {a.staffName ?? 'Doctor'}
                  </p>
                  <p className="text-sm text-muted-foreground">{a.purpose}</p>
                  {a.appointmentDate && (
                    <p className="text-xs text-muted-foreground">
                      {formatIstDateTime(a.appointmentDate)}
                    </p>
                  )}
                  {a.visitor?.phone && (
                    <p className="text-xs text-muted-foreground">{a.visitor.phone}</p>
                  )}
                </div>
                <Badge variant={STATUS_VARIANT[a.status] ?? 'outline'}>{a.status}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
