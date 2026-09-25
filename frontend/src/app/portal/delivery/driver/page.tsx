'use client';

import Link from 'next/link';
import { Suspense } from 'react';

import { AuthPasswordLoginForm } from '@/components/auth/AuthPasswordLoginForm';
import { AuthPageShell } from '@/components/auth/AuthPageShell';

/** Direct driver sign-in (DELIVERY_AGENT accounts). */
export default function PortalDeliveryDriverLoginPage() {
  return (
    <AuthPageShell>
      <div className="flex w-full max-w-lg flex-col gap-4">
        <Suspense fallback={null}>
          <AuthPasswordLoginForm forcedRole="DELIVERY_AGENT" />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/portal/delivery" className="font-medium text-amber-800 hover:underline">
            Distributor login
          </Link>
          {' · '}
          <Link href="/vendor/register" className="font-medium text-amber-800 hover:underline">
            Apply as distributor
          </Link>
          {' · '}
          <Link href="/portal" className="font-medium text-primary hover:underline">
            All portals
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
