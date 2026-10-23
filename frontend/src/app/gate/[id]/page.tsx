'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { HeartHandshake, Package, Smartphone, UserRound } from 'lucide-react';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { attendantApplyPath } from '@/lib/attendant-pass-url';
import { getStoredAuthToken } from '@/lib/auth-storage';
import { gateIdFromLocation } from '@/lib/static-export-route';
import { gateDeepLink, gateWebUrl, tryOpenNativeGateApp } from '@/lib/gate-deeplink';

type BranchInfo = {
  id: string;
  name: string;
  city?: string | null;
  slug?: string | null;
  hospitalChainName?: string | null;
};

function visitorHref(id: string, name: string): string {
  const params = new URLSearchParams({
    branchId: id,
    branchName: name,
    mode: 'offline',
  });
  return `/book-appointment/?${params.toString()}`;
}

function deliveryHref(id: string): string {
  const book = `/vendor/deliveries/book/?branchId=${encodeURIComponent(id)}`;
  try {
    const token = getStoredAuthToken();
    if (token) {
      const user = jwtDecode<{ role?: string }>(token);
      if (user.role === 'DISTRIBUTOR') return book;
    }
  } catch {
    /* fall through to login */
  }
  return `/delivery/login/?returnTo=${encodeURIComponent(book)}`;
}

export default function HospitalGatePage(): React.ReactElement {
  const params = useParams();
  const [branchId, setBranchId] = React.useState(() =>
    gateIdFromLocation(typeof window === 'undefined' ? '' : window.location.pathname, params.id),
  );
  const [info, setInfo] = React.useState<BranchInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [missing, setMissing] = React.useState(false);
  const [appPrompted, setAppPrompted] = React.useState(false);

  React.useEffect(() => {
    setBranchId(gateIdFromLocation(window.location.pathname, params.id));
  }, [params.id]);

  // On mobile browsers: auto-redirect to native app (once per session).
  React.useEffect(() => {
    if (!branchId || typeof window === 'undefined') return;
    const web = gateWebUrl(branchId, window.location.origin);
    const prompted = tryOpenNativeGateApp(branchId, web);
    if (prompted) setAppPrompted(true);
  }, [branchId]);

  React.useEffect(() => {
    if (!branchId) {
      setLoading(false);
      setMissing(true);
      return;
    }
    let cancelled = false;
    fetch(`/api/public/visitors/branch-info?branchId=${encodeURIComponent(branchId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('missing');
        return (await res.json()) as BranchInfo;
      })
      .then((data) => {
        if (cancelled) return;
        setInfo(data);
        setMissing(false);
      })
      .catch(() => {
        if (!cancelled) {
          setInfo(null);
          setMissing(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  if (loading) {
    return <ConnitorLoader variant="fullscreen" message="Opening hospital desk…" />;
  }

  const title = info?.name ?? 'Hospital desk';
  const subtitle = [info?.hospitalChainName, info?.city].filter(Boolean).join(' · ');

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md space-y-4 px-4 py-8">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-primary/70">Conninter</p>

      {/* Mobile browser → offer to open in app */}
      {appPrompted && branchId ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">Open in the Conninter app</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Get the best experience — no login needed for attendant passes.
              </p>
              <div className="mt-2 flex gap-3">
                <a
                  href={gateDeepLink(branchId, gateWebUrl(branchId, typeof window !== 'undefined' ? window.location.origin : ''))}
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Open app
                </a>
                <a
                  href={`?stay=1`}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Continue in browser
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-xl">{missing ? 'Desk code not active' : title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-center text-sm">
          {missing || !info ? (
            <p className="text-muted-foreground">This hospital desk code is not active.</p>
          ) : (
            <>
              {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
              <p className="text-muted-foreground">Choose what you need at this hospital.</p>
              <Button asChild className="h-12 w-full">
                <Link href={visitorHref(info.id, info.name)}>
                  <UserRound className="mr-2 h-4 w-4" />
                  Visitor — book a visit
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 w-full">
                <Link href={deliveryHref(info.id)}>
                  <Package className="mr-2 h-4 w-4" />
                  Delivery — book a drop
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 w-full">
                <Link href={attendantApplyPath(info)}>
                  <HeartHandshake className="mr-2 h-4 w-4" />
                  Attendant — apply for a pass
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
