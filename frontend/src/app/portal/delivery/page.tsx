'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, Truck } from 'lucide-react';

import { AuthPasswordLoginForm } from '@/components/auth/AuthPasswordLoginForm';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { Button } from '@/components/ui/button';
import { PORTAL_DELIVERY_DRIVER_LOGIN_PATH } from '@/lib/role-portals';

/** Distributor sign-in; drivers use a separate direct link below. */
export default function PortalDeliveryLoginPage() {
  return (
    <AuthPageShell>
      <div className="flex w-full max-w-lg flex-col gap-4">
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-center text-sm text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Distributors</span> book deliveries and manage drivers.
          Use the email and password from your distributor account.
        </p>
        <Suspense fallback={null}>
          <AuthPasswordLoginForm forcedRole="DISTRIBUTOR" />
        </Suspense>

        <div className="rounded-xl border border-[#001B71]/10 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
              <Truck className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">Drivers</p>
              <p className="mt-1 text-sm text-muted-foreground leading-snug">
                Drivers need a <span className="font-medium">DELIVERY_AGENT</span> login created by your distributor.
                Sign in on the driver page—not the distributor form above.
              </p>
              <Button asChild variant="outline" className="mt-3 w-full !rounded-full sm:w-auto">
                <Link href={PORTAL_DELIVERY_DRIVER_LOGIN_PATH}>
                  Driver login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
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
