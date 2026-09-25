'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2 } from 'lucide-react';
import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getVisitorToken } from '@/lib/services/visitorPortalService';
import { AppointmentService, type DoctorSlot } from '@/lib/services/appointmentService';
import {
  UrgentGatePublicService,
  type UrgentGateBookResult,
  type UrgentGateSession,
} from '@/lib/services/urgentGatePublicService';
import { todayIstDateIso } from '@/lib/datetime';

function UrgentGateInner(): React.ReactElement {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const returnTo = `/visitor/urgent/?token=${encodeURIComponent(token)}`;

  const [session, setSession] = React.useState<UrgentGateSession | null>(null);
  const [sessionError, setSessionError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [slotDate, setSlotDate] = React.useState(todayIstDateIso());
  const [slots, setSlots] = React.useState<DoctorSlot[]>([]);
  const [slotId, setSlotId] = React.useState('');
  const [useWalkIn, setUseWalkIn] = React.useState(true);
  const [booking, setBooking] = React.useState(false);
  const [result, setResult] = React.useState<UrgentGateBookResult | null>(null);
  const loggedIn = Boolean(getVisitorToken());

  React.useEffect(() => {
    if (!token) {
      setSessionError('Missing gate token. Ask security to verify your passcode again.');
      setLoading(false);
      return;
    }
    UrgentGatePublicService.getSession(token)
      .then(setSession)
      .catch((e: unknown) => {
        const detail =
          typeof e === 'object' && e && 'response' in e
            ? String(
                (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '',
              )
            : '';
        setSessionError(detail || 'This link is invalid or expired.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  React.useEffect(() => {
    if (!session?.host.id || useWalkIn) {
      setSlots([]);
      return;
    }
    AppointmentService.listDoctorSlots(session.host.id, slotDate)
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [session?.host.id, slotDate, useWalkIn]);

  const book = async () => {
    if (!token || !loggedIn) return;
    setBooking(true);
    try {
      const booked = await UrgentGatePublicService.book({
        token,
        slotId: useWalkIn ? undefined : slotId || undefined,
        purpose: session?.purpose || undefined,
      });
      setResult(booked);
      toast.success('Visit approved', { description: booked.message });
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Could not book visit');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </p>
    );
  }

  if (sessionError || !session) {
    return (
      <Card className="mx-auto max-w-lg border-red-100">
        <CardHeader>
          <CardTitle>Unable to continue</CardTitle>
          <CardDescription>{sessionError ?? 'Unknown error'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/">Back home</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>You&apos;re approved</CardTitle>
            <CardDescription>
              Show these QR codes to security. Entry for check-in, Exit for checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 text-center">
              <p className="text-sm font-semibold text-emerald-800">Entry QR</p>
              <div className="flex justify-center">
                <QRCodeSVG value={result.entryQrPayload} size={160} level="M" includeMargin />
              </div>
            </div>
            <div className="space-y-2 text-center">
              <p className="text-sm font-semibold text-amber-800">Exit QR</p>
              <div className="flex justify-center">
                <QRCodeSVG value={result.exitQrPayload} size={160} level="M" includeMargin />
              </div>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          Host: {result.host.name} · Status: {result.status}
        </p>
        <Button asChild className="w-full" variant="outline">
          <Link href="/visitor/dashboard/">Open visitor dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <Card className="mx-auto max-w-lg border-indigo-100">
      <CardHeader>
        <CardTitle>Urgent visit booking</CardTitle>
        <CardDescription>
          {session.branchName ?? 'Hospital'} · Dr. {session.host.name ?? 'Host'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(session.theme || session.purpose) && (
          <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm space-y-1">
            {session.theme ? (
              <p>
                <span className="text-muted-foreground">Theme:</span> {session.theme}
              </p>
            ) : null}
            {session.purpose ? (
              <p>
                <span className="text-muted-foreground">Purpose:</span> {session.purpose}
              </p>
            ) : null}
          </div>
        )}

        {!loggedIn ? (
          <div className="space-y-3 rounded-md border border-amber-100 bg-amber-50/80 p-4">
            <p className="text-sm text-amber-950">
              Create or sign in to your visitor profile to book. No further doctor approval is needed
              — the passcode already covers it.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                <Link href={`/visitor/register?returnTo=${encodeURIComponent(returnTo)}`}>
                  Create profile
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href={`/visitor/login?returnTo=${encodeURIComponent(returnTo)}`}>
                  Sign in
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useWalkIn}
                onChange={(e) => setUseWalkIn(e.target.checked)}
              />
              Book for ASAP walk-in (next ~15 minutes)
            </label>
            {!useWalkIn && (
              <>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
                </div>
                <div>
                  <Label>Open slot</Label>
                  <Select value={slotId} onValueChange={setSlotId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {slots.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label || s.slotStart}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={booking || (!useWalkIn && !slotId)}
              onClick={() => void book()}
            >
              {booking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking…
                </>
              ) : (
                'Confirm visit & get QR codes'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VisitorUrgentPage() {
  return (
    <VisitorPortalShell>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Suspense
          fallback={
            <p className="py-16 text-center text-muted-foreground">Loading urgent visit…</p>
          }
        >
          <UrgentGateInner />
        </Suspense>
      </main>
    </VisitorPortalShell>
  );
}
