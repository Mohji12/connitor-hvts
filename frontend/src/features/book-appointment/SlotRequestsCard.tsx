'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppointmentService, type SlotRequestRecord } from '@/lib/services/appointmentService';

const STATUS_LABEL: Record<SlotRequestRecord['status'], string> = {
  PENDING: 'Waiting for doctor',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const STATUS_VARIANT: Record<SlotRequestRecord['status'], 'secondary' | 'default' | 'destructive'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

function formatWhen(req: SlotRequestRecord): string {
  const [y, m, d] = req.date.split('-').map(Number);
  const [hh, mm] = req.time.split(':').map(Number);
  const when = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  return when.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Visit slots the visitor asked doctors for; hidden when there are none. */
export function SlotRequestsCard(): React.ReactElement | null {
  const { data } = useSWR('visitor-slot-requests', () => AppointmentService.listSlotRequests(), {
    refreshInterval: 15_000,
  });

  if (!data || data.length === 0) return null;

  return (
    <Card className="border-[#001B71]/08">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-primary" />
          Visit requests
        </CardTitle>
        <CardDescription>Times you asked a doctor for. We WhatsApp you when they confirm.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((req) => (
          <div
            key={req.id}
            className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <p className="font-medium">
                {req.doctorName} · {formatWhen(req)}
              </p>
              <p className="text-muted-foreground">
                {req.branchName}
                {req.departmentName ? ` · ${req.departmentName}` : ''}
              </p>
              <p className="text-muted-foreground break-words">Purpose: {req.purpose}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={STATUS_VARIANT[req.status]}>
                {req.status === 'APPROVED' && req.slotBooked ? 'Booked' : STATUS_LABEL[req.status]}
              </Badge>
              {req.status === 'APPROVED' && !req.slotBooked && (
                <Button asChild size="sm">
                  <Link href={`/book-appointment/?slotRequest=${req.id}`}>Book now</Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
