'use client';

import { useEffect, useState, useCallback } from 'react';
import type { AxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Calendar, LogOut, MessageSquare, QrCode, Stethoscope } from 'lucide-react';
import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  VisitorPortalService,
  clearVisitorToken,
  getVisitorToken,
  type VisitorAppointment,
} from '@/lib/services/visitorPortalService';
import { formatIstDateTime } from '@/lib/datetime';
import { VisitorProfilePreviewCard } from '@/features/visitor-pre-registration/preview/VisitorProfilePreviewCard';
import type { VisitorPreviewData } from '@/features/visitor-pre-registration/schemas/visitorAccountSchema';

const STATUS_LABELS: Record<string, string> = {
  REQUEST_SENT: 'Awaiting doctor approval',
  APPROVED: 'Approved',
  CHECKED_IN: 'Checked in',
  CHECKED_OUT: 'Completed',
  REJECTED: 'Not approved',
  PENDING: 'Pending',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return formatIstDateTime(value);
}

function AppointmentCard({ item }: { item: VisitorAppointment }) {
  const hasFeedback = Boolean(item.doctorFeedback);
  return (
    <Card className="border-[#001B71]/08">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{item.departmentName ?? 'Appointment'}</CardTitle>
            <CardDescription>
              {item.subDepartmentName && `${item.subDepartmentName} · `}
              {item.branchName}
            </CardDescription>
          </div>
          <Badge variant="outline">{STATUS_LABELS[item.status] ?? item.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Doctor:</span>{' '}
            {item.doctorName ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Scheduled:</span>{' '}
            {formatDate(item.appointmentDate)}
          </p>
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">Purpose:</span> {item.purpose ?? '—'}
          </p>
          {item.checkInTime && (
            <p>
              <span className="text-muted-foreground">Checked in:</span>{' '}
              {formatDate(item.checkInTime)}
            </p>
          )}
          {item.checkOutTime && (
            <p>
              <span className="text-muted-foreground">Checked out:</span>{' '}
              {formatDate(item.checkOutTime)}
            </p>
          )}
        </div>

        {hasFeedback && (
          <div className="rounded-lg border border-[#001B71]/08 bg-[#4A90E2]/10 p-3">
            <p className="flex items-center gap-2 font-medium text-primary">
              <MessageSquare className="h-4 w-4" />
              Message from doctor
            </p>
            <p className="mt-1 text-slate-800">{item.doctorFeedback}</p>
            {item.doctorFeedbackAt && (
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.doctorFeedbackAt)}</p>
            )}
          </div>
        )}

        {!hasFeedback && item.status === 'REQUEST_SENT' && (
          <p className="text-muted-foreground italic">
            Waiting for the doctor to review your request…
          </p>
        )}

        {item.status === 'APPROVED' && item.checkInQrCode && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-center">
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-900 mb-3">
              <QrCode className="h-4 w-4" />
              Show this QR at hospital security
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.checkInQrCode}
              alt="Check-in QR code"
              className="mx-auto h-48 w-48 rounded-md border border-emerald-100 bg-white p-2"
            />
            {item.checkInOtp && (
              <p className="mt-3 text-xs text-emerald-800">
                Backup OTP: <span className="font-mono font-semibold">{item.checkInOtp}</span>
                {item.checkInOtpExpiry && (
                  <> · valid until {formatDate(item.checkInOtpExpiry)}</>
                )}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VisitorDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const redirectToLogin = useCallback(() => {
    clearVisitorToken();
    router.replace('/visitor/login');
  }, [router]);

  useEffect(() => {
    if (!getVisitorToken()) {
      redirectToLogin();
      return;
    }
    setReady(true);
  }, [redirectToLogin]);

  const { data, error, isLoading, mutate } = useSWR(
    ready ? 'visitor-appointments' : null,
    () => VisitorPortalService.getAppointments(),
    {
      refreshInterval: 5_000,
      shouldRetryOnError: (err) => (err as AxiosError).response?.status !== 401,
      onError: (err) => {
        if ((err as AxiosError).response?.status === 401) {
          setReady(false);
          redirectToLogin();
        }
      },
    },
  );

  const logout = () => {
    clearVisitorToken();
    router.push('/visitor/login');
  };

  if (!ready) {
    return null;
  }

  return (
    <VisitorPortalShell
      headerExtra={
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      }
    >
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8 sm:p-6">
        {data?.profile && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <VisitorProfilePreviewCard
              data={data.profile as VisitorPreviewData}
              className="max-w-md flex-1"
            />
            <Button asChild variant="outline" size="sm">
              <Link href="/visitor/dashboard/profile">Edit profile</Link>
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-primary" />
              My appointment history
            </h1>
            {data && (
              <p className="text-muted-foreground mt-1">
                Welcome, {data.visitorName}
                {data.email ? ` · ${data.email}` : data.phone ? ` · ${data.phone}` : ''}
              </p>
            )}
          </div>
          <Button asChild variant="outline">
            <Link href="/book-appointment">
              <Calendar className="mr-2 h-4 w-4" />
              Book new visit
            </Link>
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && (
          <Card className="border-destructive/30">
            <CardContent className="pt-6 text-sm text-destructive">
              Could not load appointments.{' '}
              <button type="button" className="underline" onClick={() => mutate()}>
                Retry
              </button>
            </CardContent>
          </Card>
        )}

        {data && data.appointments.length === 0 && (
          <Card className="border-[#001B71]/08">
            <CardContent className="py-10 text-center text-muted-foreground">
              No appointments yet.{' '}
              <Link href="/book-appointment" className="text-primary underline">
                Book your first visit
              </Link>
            </CardContent>
          </Card>
        )}

        {data && data.appointments.length > 0 && (
          <div className="space-y-4">
            {data.appointments.map((item) => (
              <AppointmentCard key={item.bookingId} item={item} />
            ))}
          </div>
        )}
      </main>
    </VisitorPortalShell>
  );
}
