'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Hourglass,
  LogOut,
  RefreshCw,
  Stethoscope,
  X,
} from 'lucide-react';
import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import {
  VisitorPortalService,
  clearVisitorToken,
  getVisitorToken,
  type VisitorAppointment,
} from '@/lib/services/visitorPortalService';
import { IST_TIMEZONE } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import { SlotRequestsCard } from '@/features/book-appointment/SlotRequestsCard';
import { VisitorWalletService, type VisitorWalletSummary } from '@/lib/services/visitorWalletService';
import { statusLabel } from '@/components/mobile/StatusChip';
import { AppointmentRow } from '@/features/visitor-dashboard/AppointmentRow';
import { NextVisitCard, ProfileCard, WalletCard } from '@/features/visitor-dashboard/DashboardCards';
import {
  countVisits,
  matchesVisitFilter,
  sortVisits,
  type VisitFilter,
} from '@/features/visitor-dashboard/visit-filters';
import { cacheVisitorPasses, clearVisitorPassCache, pickUpcomingVisit } from '@/lib/visitor-pass-cache';

const FILTER_TABS: { value: VisitFilter; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'pending', label: 'Awaiting' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];

const EMPTY_TEXT: Record<VisitFilter, string> = {
  upcoming: 'No upcoming visits.',
  pending: 'Nothing is waiting for a doctor right now.',
  past: 'No past visits yet.',
  all: 'No visits yet.',
};

function readBookedIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('booked');
}

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-IN', { timeZone: IST_TIMEZONE, hour: 'numeric', hourCycle: 'h23' }).format(
      new Date(),
    ),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function BookedBanner({ item, onDismiss }: { item: VisitorAppointment | undefined; onDismiss: () => void }) {
  const label = item ? statusLabel(item.status) : 'Awaiting doctor';
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
    >
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Your visit is booked</p>
        <p className="mt-0.5 text-emerald-900/80">
          Status: <span className="font-medium">{label}</span>. This page updates automatically, and your gate pass
          appears here once the doctor approves.
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

interface StatTileProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  active: boolean;
  onClick: () => void;
}

function StatTile({ label, value, icon: Icon, tone, active, onClick }: StatTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm transition sm:p-4',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90E2]',
        active ? 'border-[#001B71]/40 ring-1 ring-[#001B71]/20' : 'border-slate-200',
      )}
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold leading-none text-slate-900">{value}</span>
        <span className="mt-1 block truncate text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
      </span>
    </button>
  );
}

export default function VisitorDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [bookedId, setBookedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<VisitFilter>('upcoming');
  const listRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const booked = readBookedIdFromUrl();
    if (!booked) return;
    setBookedId(booked);
    setFilter('all');
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

  const { data: wallet } = useSWR<VisitorWalletSummary>(ready ? 'visitor-wallet' : null, () =>
    VisitorWalletService.getWallet(),
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR(
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

  const appointments = useMemo(() => data?.appointments ?? [], [data]);
  const counts = useMemo(() => countVisits(appointments), [appointments]);
  const visible = useMemo(
    () => sortVisits(appointments.filter((item) => matchesVisitFilter(item, filter)), filter),
    [appointments, filter],
  );
  const upcoming = data ? pickUpcomingVisit(appointments) : null;
  const bookedItem = bookedId ? appointments.find((a) => a.bookingId === bookedId) : undefined;

  const logout = () => {
    clearVisitorToken();
    clearVisitorPassCache();
    router.push('/visitor/login');
  };

  const showFilter = (next: VisitFilter) => {
    setFilter(next);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!ready || isLoading) {
    return <ConnitorLoader variant="fullscreen" message="Loading your visits…" />;
  }

  const firstName = (data?.profile?.fullName || data?.visitorName || '').split(' ')[0];

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
      <main className="mx-auto w-full min-w-0 max-w-6xl space-y-5 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-8">
        {bookedId && <BookedBanner item={bookedItem} onDismiss={() => setBookedId(null)} />}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{greeting()},</p>
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {firstName || 'Welcome back'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Your visits, gate passes and wallet in one place.</p>
          </div>
          <Button asChild className="h-10 max-sm:hidden">
            <Link href="/book-appointment">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Book new visit
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Upcoming"
            value={counts.upcoming}
            icon={CalendarClock}
            tone="bg-[#4A90E2]/12 text-[#1d5fae]"
            active={filter === 'upcoming'}
            onClick={() => showFilter('upcoming')}
          />
          <StatTile
            label="Awaiting doctor"
            value={counts.pending}
            icon={Hourglass}
            tone="bg-amber-100 text-amber-700"
            active={filter === 'pending'}
            onClick={() => showFilter('pending')}
          />
          <StatTile
            label="Completed"
            value={counts.completed}
            icon={CheckCircle2}
            tone="bg-emerald-100 text-emerald-700"
            active={filter === 'past'}
            onClick={() => showFilter('past')}
          />
          <StatTile
            label="Total visits"
            value={counts.total}
            icon={Stethoscope}
            tone="bg-[#001B71]/10 text-[#001B71]"
            active={filter === 'all'}
            onClick={() => showFilter('all')}
          />
        </div>

        <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-5 sm:space-y-6">
            <NextVisitCard item={upcoming} />
            <SlotRequestsCard />

            <section ref={listRef} className="scroll-mt-24 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  Your visits
                  {isValidating ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" aria-label="Refreshing" />
                  ) : null}
                </h2>
                <Tabs value={filter} onValueChange={(value) => setFilter(value as VisitFilter)}>
                  <TabsList className="h-10 w-full bg-slate-100 sm:w-fit">
                    {FILTER_TABS.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value} className="px-3">
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {error ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  Could not load your visits.
                  <Button size="sm" variant="outline" onClick={() => mutate()}>
                    Retry
                  </Button>
                </div>
              ) : null}

              {visible.length > 0 ? (
                <div className="space-y-3">
                  {visible.map((item) => (
                    <AppointmentRow key={item.bookingId} item={item} highlighted={item.bookingId === bookedId} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
                  <p className="text-sm text-muted-foreground">{EMPTY_TEXT[filter]}</p>
                  {filter !== 'past' ? (
                    <Button asChild variant="outline" size="sm" className="mt-4">
                      <Link href="/book-appointment">
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        Book a visit
                      </Link>
                    </Button>
                  ) : null}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5 sm:space-y-6 lg:sticky lg:top-24">
            <WalletCard wallet={wallet} />
            {data ? <ProfileCard data={data} /> : null}
          </aside>
        </div>
      </main>
    </VisitorPortalShell>
  );
}
