'use client';

import Link from 'next/link';
import { LogIn, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DELIVERY_PORTALS } from '@/lib/role-portals';

const ICONS = {
  DISTRIBUTOR: Truck,
} as const;

export function DeliveryPortalGrid() {
  return (
    <section id="delivery-portals" className="mt-14 space-y-4 sm:mt-16">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">Delivery partners</h2>
        <p className="text-sm text-slate-600 max-w-3xl">
          Distributors schedule inbound deliveries to hospitals. Drivers receive full delivery
          instructions and the gate check-in QR by email — no separate login required.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {DELIVERY_PORTALS.map((portal) => {
          const Icon = ICONS[portal.id];
          return (
            <Card
              key={portal.id}
              className="flex flex-col border-amber-100/80 bg-white/90 shadow-sm transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle className="text-base leading-snug">{portal.label}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {portal.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-2 pt-0">
                <Button asChild className="w-full bg-amber-600 hover:bg-amber-700">
                  <Link href={portal.loginPath}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in as {portal.label.toLowerCase()}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full border-amber-200">
                  <Link href="/vendor/register">Apply to onboard</Link>
                </Button>
                <p className="text-center text-[11px] text-muted-foreground leading-tight">
                  Dashboard:{' '}
                  <span className="font-medium text-slate-600">{portal.dashboardPath}</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
