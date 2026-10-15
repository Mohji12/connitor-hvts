'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { AxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Calendar, CheckCircle2, LogOut, MessageSquare, QrCode, Stethoscope, Wallet, X } from 'lucide-react';
import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import {
  VisitorPortalService,
  clearVisitorToken,
  getVisitorToken,
  type VisitorAppointment,
} from '@/lib/services/visitorPortalService';
import { formatIstDateTime } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import { VisitorProfilePreviewCard } from '@/features/visitor-pre-registration/preview/VisitorProfilePreviewCard';
import { SlotRequestsCard } from '@/features/book-appointment/SlotRequestsCard';
import {
  VisitorWalletService,
  type VisitorWalletSummary,
} from '@/lib/services/visitorWalletService';
import type { VisitorPreviewData } from '@/features/visitor-pre-registration/schemas/visitorAccountSchema';
import { StatusChip } from '@/components/mobile/StatusChip';
import {
  cacheVisitorPasses,
  clearVisitorPassCache,
  pickUpcomingVisit,
} from '@/lib/visitor-pass-cache';

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

function readBookedIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('booked');
}

function BookedBanner({ item, onDismiss }: { item: VisitorAppointment | undefined; onDismiss: () => void }) {
  const label = item ? (STATUS_LABELS[item.status] ?? item.status) : 'Awaiting doctor approval';
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
    >
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Your visit is booked</p>
        <p className="mt-0.5 text-emerald-900/80">
          Status: <span className="font-medium">{label}</span>. This page updates automatically, and your
          gate pass appears here once the doctor approves.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-m-1 rounded-md p-1 text-emerald-700 hover:bg-emerald-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function AppointmentCard({ item, highlighted = false }: { item: VisitorAppointment; highlighted?: boolean }) {
  const hasFeedback = Boolean(item.doctorFeedback);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted) cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlighted]);

  return (
    <Card
      ref={cardRef}
      className={cn('border-[#001B71]/08', highlighted && 'ring-2 ring-emerald-500 ring-offset-2')}
    >
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
          <Button asChild className="h-11 w-full bg-emerald-600 hover:bg-emerald-700 lg:hidden">
            <Link href={`/visitor/pass?id=${encodeURIComponent(item.bookingId)}`}>
              <QrCode className="mr-2 h-4 w-4" />
              Show gate pass
            </Link>
          </Button>
        )}

        {item.status === 'APPROVED' && item.checkInQrCode && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-4 text-center max-lg:hidden">
            <p className="mb-3 flex items-center justify-center gap-2 text-sm font-medium text-emerald-900">
              <QrCode className="h-4 w-4" />
              Show this QR at hospital security
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.checkInQrCode}
              alt="Check-in QR code"
              className="mx-auto aspect-square h-56 w-56 object-contain"
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

/** Phone home hero: the next visit and a one-tap path to its gate pass. */
function UpcomingVisitCard({ item }: { item: VisitorAppointment }) {
  const hasPass = (item.status === 'APPROVED' || item.status === 'CHECKED_IN') && Boolean(item.checkInQrCode);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:hidden">
      <div className="flex items-start justify-between gap-2">
        <p className="m-meta font-semibold uppercase tracking-wide">Next visit</p>
        <StatusChip status={item.status} />
      </div>
      <p className="mt-2 text-lg font-semibold leading-snug text-foreground">
        {item.doctorName ? `Dr. ${item.doctorName.replace(/^Dr\.?\s*/i, '')}` : (item.departmentName ?? 'Appointment')}
      </p>
      <p className="m-meta mt-0.5">
        {[item.departmentName, item.branchName].filter(Boolean).join(' · ')}
      </p>
      <p className="mt-3 flex items-center gap-2 text-sm font-medium text-primary">
        <Calendar className="h-4 w-4" />
        {formatDate(item.appointmentDate)}
      </p>
      {hasPass ? (
        <Button asChild className="mt-4 h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700">
          <Link href={`/visitor/pass?id=${encodeURIComponent(item.bookingId)}`}>
            <QrCode className="mr-2 h-5 w-5" />
            Show gate pass
          </Link>
        </Button>
      ) : item.status === 'REQUEST_SENT' ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Waiting for the doctor to approve. Your pass appears here once approved.
        </p>
      ) : null}
    </div>
  );
}

export default function VisitorDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [bookedId, setBookedId] = useState<string | null>(null);

  useEffect(() => {
    const booked = readBookedIdFromUrl();
    if (!booked) return;
    setBookedId(booked);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

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

  const { data: wallet, isLoading: walletLoading } = useSWR<VisitorWalletSummary>(
    ready ? 'visitor-wallet' : null,
    () => VisitorWalletService.getWallet(),
  );

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

  useEffect(() => {
    if (data?.appointments) cacheVisitorPasses(data.appointments);
  }, [data]);

  const logout = () => {
    clearVisitorToken();
    clearVisitorPassCache();
    router.push('/visitor/login');
  };

  const upcoming = data ? pickUpcomingVisit(data.appointments) : null;
  const bookedItem = bookedId ? data?.appointments.find((a) => a.bookingId === bookedId) : undefined;

  if (!ready || isLoading || walletLoading) {
    return (
      <ConnitorLoader
        variant="fullscreen"
        message="Loading your visits…"
      />
    );
  }

  return (
    <VisitorPortalShell
      appTabs
      headerExtra={
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          aria-label="Sign out"
          className="h-9 w-9 p-0 text-muted-foreground sm:w-auto sm:px-3"
        >
          <LogOut className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      }
    >
      <main className="mx-auto w-full min-w-0 max-w-4xl space-y-4 p-4 sm:p-6 sm:py-8 lg:space-y-6">
        {bookedId && <BookedBanner item={bookedItem} onDismiss={() => setBookedId(null)} />}

        {data && (
          <div className="lg:hidden">
            <p className="m-meta">Welcome back</p>
            <h1 className="m-title text-xl">{data.visitorName}</h1>
          </div>
        )}

        {upcoming ? <UpcomingVisitCard item={upcoming} /> : null}

        <SlotRequestsCard />

        {data?.profile && (
          <div className="flex min-w-0 flex-col gap-3 max-lg:hidden sm:flex-row sm:items-start sm:justify-between">
            <VisitorProfilePreviewCard
              data={data.profile as VisitorPreviewData}
              className="w-full min-w-0 max-w-md flex-1"
            />
            <Button asChild variant="outline" size="sm">
              <Link href="/visitor/dashboard/profile">Edit profile</Link>
            </Button>
          </div>
        )}

        <Link
          href="/visitor/wallet"
          className="block overflow-hidden rounded-2xl bg-gradient-to-br from-[#001B71] to-[#4A90E2] p-5 text-white shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm text-white/80">
                <Wallet className="h-4 w-4" />
                Wallet
              </p>
              <p className="mt-2 text-2xl font-bold sm:text-3xl">
                ₹{wallet ? wallet.balance.toFixed(2) : '—'}
              </p>
              <p className="mt-1 text-sm text-white/80">
                Available ₹{wallet ? wallet.available.toFixed(2) : '—'}
                {wallet && wallet.reserved > 0 ? ` · Reserved ₹${wallet.reserved.toFixed(2)}` : ''}
              </p>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs">Recharge</span>
          </div>
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="m-section lg:hidden">Your visits</h2>
            <h1 className="hidden items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl lg:flex">
              <Stethoscope className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
              My appointment history
            </h1>
            {data && (
              <p className="text-muted-foreground mt-1 max-lg:hidden">
                Welcome, {data.visitorName}
                {data.email ? ` · ${data.email}` : data.phone ? ` · ${data.phone}` : ''}
              </p>
            )}
          </div>
          <Button asChild variant="outline" className="max-lg:hidden">
            <Link href="/book-appointment">
              <Calendar className="mr-2 h-4 w-4" />
              Book new visit
            </Link>
          </Button>
        </div>

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
              <AppointmentCard key={item.bookingId} item={item} highlighted={item.bookingId === bookedId} />
            ))}
          </div>
        )}
      </main>
    </VisitorPortalShell>
  );
}
