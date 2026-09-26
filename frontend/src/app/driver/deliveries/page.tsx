'use client';

import Link from 'next/link';
import { Loader2, Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthSession } from '@/hooks/useAuthSession';

export default function DriverDeliveriesPage() {
  const user = useAuthSession<{ name?: string; email?: string }>({
    requiredRole: 'DELIVERY_AGENT',
    redirectTo: '/delivery/driver/login',
  });

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card className="border-[#001B71]/08 shadow-sm">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
            <Truck className="h-5 w-5" aria-hidden />
          </div>
          <CardTitle>Driver deliveries</CardTitle>
          <CardDescription>
            Signed in as {user.name ?? user.email ?? 'driver'}. Gate QR and full instructions are also sent to your
            email for each assigned run.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your distributor assigns deliveries from their portal. Check your inbox for the latest gate pass and route
            details.
          </p>
          <Button asChild variant="outline">
            <Link href="/portal">Back to sign-in hub</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
