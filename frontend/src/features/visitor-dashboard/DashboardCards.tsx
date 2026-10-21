'use client';

import Link from 'next/link';
import { ArrowRight, CalendarClock, CalendarPlus, Mail, MapPin, Pencil, Phone, Plus, Wallet } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusChip } from '@/components/mobile/StatusChip';
import { formatIstDateTime } from '@/lib/datetime';
import type { VisitorAppointment, VisitorDashboardData } from '@/lib/services/visitorPortalService';
import type { VisitorWalletSummary } from '@/lib/services/visitorWalletService';
import { visitorVisitPath } from '@/lib/static-export-route';
import { GatePassButton } from './GatePassButton';
import { hasGatePass, hostLabel } from './visit-filters';

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

export function initialsOf(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'V'
  );
}

export function NextVisitCard({ item }: { item: VisitorAppointment | null }): React.ReactElement {
  if (!item) {
    return (
      <section className={`${CARD} flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4A90E2]/12 text-[#1d5fae]">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-slate-900">No upcoming visits</p>
            <p className="text-sm text-muted-foreground">Book a hospital visit or meet a distributor.</p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/book-appointment">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Book a visit
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/book-distributor-visit">Meet a distributor</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#001B71] via-[#0b2f8f] to-[#4A90E2] p-5 text-white shadow-md sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Next visit</p>
        <StatusChip status={item.status} className="bg-white/90" />
      </div>
      <h2 className="relative mt-2 text-xl font-semibold leading-snug sm:text-2xl">
        {hostLabel(item)}
      </h2>
      <div className="relative mt-3 flex flex-col gap-1.5 text-sm text-white/85 sm:flex-row sm:flex-wrap sm:gap-x-5">
        <span className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 shrink-0" />
          {formatIstDateTime(item.appointmentDate)}
        </span>
        {item.departmentName || item.branchName ? (
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{[item.departmentName, item.branchName].filter(Boolean).join(' · ')}</span>
          </span>
        ) : null}
      </div>
      <div className="relative mt-5 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <Button asChild variant="secondary" className="w-full bg-white text-[#001B71] hover:bg-white/90 lg:w-auto">
          <a href={visitorVisitPath(item.bookingId)}>View details</a>
        </Button>
        {hasGatePass(item) ? (
          <div className="space-y-2 lg:space-y-0">
            <GatePassButton item={item} size="lg" className="w-full lg:w-auto lg:px-6" />
            <p className="text-xs text-white/75 lg:hidden">Gate pass is saved on this phone for the hospital gate.</p>
          </div>
        ) : item.status === 'REQUEST_SENT' ? (
          <p className="rounded-xl bg-white/12 px-3 py-2 text-sm text-white/90">
            Waiting for the doctor to approve. Your gate pass appears here once approved.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function WalletCard({ wallet }: { wallet: VisitorWalletSummary | undefined }): React.ReactElement {
  return (
    <Link
      href="/visitor/wallet"
      className={`${CARD} group block p-5 transition hover:-translate-y-0.5 hover:border-[#001B71]/20 hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Wallet className="h-4 w-4" />
          </span>
          Wallet
        </span>
        <span className="flex items-center gap-1 rounded-full bg-[#001B71] px-3 py-1 text-xs font-medium text-white">
          <Plus className="h-3 w-3" />
          Recharge
        </span>
      </div>
      {wallet ? (
        <>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">₹{wallet.balance.toFixed(2)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Available ₹{wallet.available.toFixed(2)}
            {wallet.reserved > 0 ? ` · Reserved ₹${wallet.reserved.toFixed(2)}` : ''}
          </p>
        </>
      ) : (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      )}
      <p className="mt-4 flex items-center gap-1 text-sm font-medium text-[#1d5fae]">
        View transactions
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </p>
    </Link>
  );
}

export function ProfileCard({ data }: { data: VisitorDashboardData }): React.ReactElement {
  const name = data.profile?.fullName || data.visitorName;
  return (
    <section className={`${CARD} overflow-hidden`}>
      <div className="h-14 bg-gradient-to-r from-[#001B71] to-[#4A90E2]" />
      <div className="px-5 pb-5">
        <div className="-mt-8 flex items-end justify-between">
          <Avatar className="h-16 w-16 border-4 border-white shadow-sm">
            <AvatarImage src={data.profile?.photoUrl ?? undefined} alt={name} className="object-cover" />
            <AvatarFallback className="text-base font-semibold">{initialsOf(name)}</AvatarFallback>
          </Avatar>
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link href="/visitor/dashboard/profile">
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
        </div>
        <p className="mt-3 truncate font-semibold text-slate-900">{name}</p>
        {data.profile?.headline ? (
          <p className="truncate text-sm text-muted-foreground">{data.profile.headline}</p>
        ) : null}
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          {data.email ? (
            <li className="flex min-w-0 items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">{data.email}</span>
            </li>
          ) : null}
          {data.phone ? (
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-slate-400" />
              <span>+91 {data.phone.replace(/^\+?91/, '')}</span>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
