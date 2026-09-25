'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppointmentService } from '@/lib/services/appointmentService';
import { formatIstDateTime } from '@/lib/datetime';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const STATUS_LABELS: Record<string, string> = {
  REQUEST_SENT: 'Awaiting Doctor Approval',
  APPROVED: 'Approved — Ready for Check-in',
  CHECKED_IN: 'Checked In',
  CHECKED_OUT: 'Completed',
  REJECTED: 'Rejected',
  PENDING: 'Pending',
};

const MODE_LABELS: Record<string, string> = {
  IN_PERSON: 'In-person visit',
  ONLINE: 'Online consultation',
};

export default function BookingStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F9FC] p-8">
          <ConnitorLoader message="Loading appointment status…" />
        </div>
      }
    >
      <BookingStatusContent />
    </Suspense>
  );
}

function BookingStatusContent() {
  const searchParams = useSearchParams();
  const [bookingId, setBookingId] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [status, setStatus] = React.useState<Awaited<
    ReturnType<typeof AppointmentService.getBookingStatus>
  > | null>(null);

  React.useEffect(() => {
    const id = searchParams.get('bookingId');
    const p = searchParams.get('phone');
    if (id) setBookingId(id);
    if (p) setPhone(p);
    if (id && p && p.length === 10) {
      AppointmentService.getBookingStatus(id, p)
        .then(setStatus)
        .catch(() => setError('Booking not found. Check your booking ID and phone number.'));
    }
  }, [searchParams]);

  const lookup = async () => {
    setLoading(true);
    setError('');
    setStatus(null);
    try {
      const result = await AppointmentService.getBookingStatus(bookingId.trim(), phone.trim());
      setStatus(result);
    } catch {
      setError('Booking not found. Check your booking ID and phone number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] p-4 md:p-8">
      <div className="mx-auto max-w-lg space-y-4">
        <Card className="relative overflow-hidden">
          {loading && (
            <ConnitorLoader variant="overlay" message="Looking up your booking…" />
          )}
          <CardHeader>
            <CardTitle>Check Appointment Status</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter the booking ID from your confirmation and the phone number you used.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div>
              <Label>Booking ID</Label>
              <Input value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
            </div>
            <div>
              <Label>Phone (10 digits)</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
              />
            </div>
            <Button className="w-full" onClick={() => void lookup()} disabled={loading || !bookingId || phone.length !== 10}>
              {loading ? 'Looking up...' : 'Check Status'}
            </Button>
          </CardContent>
        </Card>

        {status && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Booking Details</span>
                <Badge variant="outline">
                  {status.appointmentMode === 'ONLINE' && status.status === 'APPROVED'
                    ? 'Approved — Join video consultation'
                    : status.appointmentMode === 'ONLINE' && status.status === 'CHECKED_IN'
                      ? 'Online consultation in progress'
                      : status.appointmentMode === 'ONLINE' && status.status === 'CHECKED_OUT'
                        ? 'Online consultation completed'
                        : STATUS_LABELS[status.status] ?? status.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {status.appointmentMode && (
                <p>
                  <span className="text-muted-foreground">Visit type:</span>{' '}
                  {MODE_LABELS[status.appointmentMode] ?? status.appointmentMode}
                </p>
              )}
              <p><span className="text-muted-foreground">Doctor:</span> {status.doctorName ?? '—'}</p>
              <p><span className="text-muted-foreground">Purpose:</span> {status.purpose ?? '—'}</p>
              {status.appointmentDate && (
                <p>
                  <span className="text-muted-foreground">Scheduled:</span>{' '}
                  {formatIstDateTime(status.appointmentDate)}
                </p>
              )}
              {status.checkInTime && (
                <p>
                  <span className="text-muted-foreground">Checked in:</span>{' '}
                  {formatIstDateTime(status.checkInTime)}
                </p>
              )}
              {status.checkOutTime && (
                <p>
                  <span className="text-muted-foreground">Checked out:</span>{' '}
                  {formatIstDateTime(status.checkOutTime)}
                </p>
              )}
              {status.totalDurationMinutes != null && (
                <p>
                  <span className="text-muted-foreground">Duration:</span>{' '}
                  {status.totalDurationMinutes} minutes
                </p>
              )}
              {status.rejectionReason && (
                <p>
                  <span className="text-muted-foreground">Doctor note:</span>{' '}
                  {status.rejectionReason}
                </p>
              )}
              {status.doctorFeedback && (
                <div className="rounded-md bg-[#4A90E2]/10 border border-[#001B71]/08 p-3 mt-2">
                  <p className="font-medium text-primary">Message from doctor</p>
                  <p className="text-slate-800">{status.doctorFeedback}</p>
                </div>
              )}
              {(status.status === 'APPROVED' || status.status === 'CHECKED_IN') && status.meetingJoinUrl && (
                <Button className="w-full mt-2" asChild>
                  <a href={status.meetingJoinUrl} target="_blank" rel="noopener noreferrer">
                    Join video consultation
                  </a>
                </Button>
              )}
              {status.appointmentMode === 'ONLINE' && status.status === 'REQUEST_SENT' && (
                <p className="text-xs text-muted-foreground">
                  Your video consultation link will appear here once the doctor approves your appointment.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-2 justify-center sm:flex-row">
          <Button variant="outline" asChild>
            <Link href="/visitor/login">View all my appointments</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/book-appointment">Book New Appointment</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
