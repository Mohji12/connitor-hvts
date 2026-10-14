'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Calendar, Sun, WifiOff } from 'lucide-react';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { StatusChip } from '@/components/mobile/StatusChip';
import { Button } from '@/components/ui/button';
import { formatIstDateTime } from '@/lib/datetime';
import { VisitorPortalService, getVisitorToken } from '@/lib/services/visitorPortalService';
import {
  cacheVisitorPasses,
  getCachedVisitorPass,
  type CachedVisitorPass,
} from '@/lib/visitor-pass-cache';

export default function VisitorPassPage() {
  return (
    <Suspense fallback={<ConnitorLoader variant="fullscreen" message="Opening your pass…" />}>
      <VisitorPass />
    </Suspense>
  );
}

function VisitorPass() {
  const bookingId = useSearchParams().get('id') ?? '';
  const [pass, setPass] = useState<CachedVisitorPass | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    const cached = getCachedVisitorPass(bookingId);
    if (cached) {
      setPass(cached);
      setLoading(false);
    }
    if (!getVisitorToken()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    VisitorPortalService.getAppointments()
      .then((data) => {
        if (cancelled) return;
        cacheVisitorPasses(data.appointments);
        setPass(getCachedVisitorPass(bookingId));
        setOffline(false);
      })
      .catch(() => {
        if (!cancelled) setOffline(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (loading && !pass) {
    return <ConnitorLoader variant="fullscreen" message="Opening your pass…" />;
  }

  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col bg-[#001B71] text-white">
      <div className="flex items-center gap-2 px-2 py-2">
        <Button asChild variant="ghost" size="icon" className="h-11 w-11 text-white hover:bg-white/10 hover:text-white">
          <Link href="/visitor/dashboard" aria-label="Back to home">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <p className="text-base font-semibold">Gate pass</p>
      </div>

      {!pass ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-lg font-semibold">Pass not available</p>
          <p className="mt-2 text-sm text-white/80">
            This visit has no active gate pass yet. It appears once the doctor approves.
          </p>
          <Button asChild variant="secondary" className="mt-6 h-11">
            <Link href="/visitor/dashboard">Back to my visits</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center px-5 pb-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-center text-foreground shadow-xl">
            <div className="flex items-center justify-between gap-2 text-left">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">
                  {pass.doctorName ? `Dr. ${pass.doctorName.replace(/^Dr\.?\s*/i, '')}` : (pass.departmentName ?? 'Appointment')}
                </p>
                <p className="m-meta truncate">
                  {[pass.departmentName, pass.branchName].filter(Boolean).join(' · ')}
                </p>
              </div>
              <StatusChip status={pass.status} />
            </div>
            {pass.checkInQrCode ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={pass.checkInQrCode}
                alt="Gate pass QR code"
                className="mx-auto my-4 aspect-square w-full max-w-[280px] object-contain"
              />
            ) : null}
            {pass.checkInOtp ? (
              <p className="text-sm text-muted-foreground">
                Backup OTP{' '}
                <span className="font-mono text-lg font-bold tracking-widest text-foreground">{pass.checkInOtp}</span>
              </p>
            ) : null}
            {pass.appointmentDate ? (
              <p className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-primary">
                <Calendar className="h-4 w-4" />
                {formatIstDateTime(pass.appointmentDate)}
              </p>
            ) : null}
          </div>

          <p className="mt-5 flex items-center gap-2 text-sm text-white/80">
            <Sun className="h-4 w-4" />
            Turn up screen brightness and show this at security
          </p>
          {offline ? (
            <p className="mt-2 flex items-center gap-2 text-xs text-amber-200">
              <WifiOff className="h-3.5 w-3.5" />
              Offline — showing your saved pass
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
