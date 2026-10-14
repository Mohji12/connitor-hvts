'use client';

import * as React from 'react';
import Link from 'next/link';
import { Building2, Loader2, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookAppointmentWizard } from '@/features/book-appointment/BookAppointmentWizard';
import { VisitorService } from '@/lib/services/visitorService';
import { getVisitorToken } from '@/lib/services/visitorPortalService';
import { VisitorAccountApi } from '@/features/visitor-pre-registration/api/visitorAccountService';

type OnSpotPhase = 'loading' | 'auth' | 'booking';

export interface OnSpotVisitFlowProps {
  branchId: string;
  branchNameFromQuery?: string | null;
}

function buildReturnPath(branchId: string, branchName?: string | null): string {
  const params = new URLSearchParams({ branchId });
  if (branchName) params.set('name', branchName);
  return `/visit/on-spot?${params.toString()}`;
}

export function OnSpotVisitFlow({ branchId, branchNameFromQuery }: OnSpotVisitFlowProps) {
  const [phase, setPhase] = React.useState<OnSpotPhase>('loading');
  const [branchName, setBranchName] = React.useState(branchNameFromQuery ?? '');

  const returnTo = buildReturnPath(branchId, branchName || branchNameFromQuery);

  React.useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!branchNameFromQuery) {
        try {
          const info = await VisitorService.getBranchInfo(branchId);
          if (!cancelled && info?.name) setBranchName(info.name);
        } catch {
          /* optional */
        }
      }

      const token = getVisitorToken();
      if (!token) {
        if (!cancelled) setPhase('auth');
        return;
      }

      try {
        const profile = await VisitorAccountApi.getMyProfile(token);
        if (!cancelled) {
          if (profile.profileStatus === 'ACTIVE') {
            setPhase('booking');
          } else {
            setPhase('auth');
          }
        }
      } catch {
        if (!cancelled) setPhase('auth');
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [branchId, branchNameFromQuery]);

  const registerHref = `/visitor/register?returnTo=${encodeURIComponent(returnTo)}`;
  const loginHref = `/visitor/login?returnTo=${encodeURIComponent(returnTo)}`;

  if (phase === 'loading') {
    return (
      <p className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </p>
    );
  }

  if (phase === 'auth') {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#4A90E2]/15 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle>Welcome to {branchName || 'the hospital'}</CardTitle>
          <CardDescription>
            Create your Conninter profile or sign in, then book a doctor appointment — same as online
            booking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" asChild>
            <Link href={registerHref}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create profile
            </Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href={loginHref}>
              <LogIn className="mr-2 h-4 w-4" />
              I already have a profile
            </Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground pt-2">
            After sign-in you&apos;ll return here to pick a doctor and time slot.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <BookAppointmentWizard
      initialBranchId={branchId}
      initialBranchName={branchName || branchNameFromQuery || undefined}
      title="Book your visit"
      showHeaderLinks={false}
    />
  );
}
