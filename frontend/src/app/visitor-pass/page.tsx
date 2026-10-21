'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus } from 'lucide-react';

import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getVisitorToken } from '@/lib/services/visitorPortalService';
import { VisitorAuthService } from '@/lib/services/visitorAuthService';

/** In-person visits only — video consults are under Online session. */
const RETURN_TO = '/book-appointment/?mode=offline';

export default function VisitorPassPage() {
  const router = useRouter();

  React.useEffect(() => {
    if (!getVisitorToken()) return;
    let cancelled = false;
    void VisitorAuthService.hasValidSession().then((valid) => {
      if (valid && !cancelled) router.replace(RETURN_TO);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <VisitorPortalShell>
      <div className="mx-auto flex max-w-lg flex-col p-4 py-10">
      <Card className="w-full border-[#001B71]/08 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold">Visitor pass</CardTitle>
          <CardDescription className="text-base">
            Sign in or create a profile to book an in-person hospital visit. For a video consult,
            use Online session on the home page.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button asChild variant="brand" className="h-12 !rounded-full font-semibold">
            <Link href={`/visitor/login?returnTo=${encodeURIComponent(RETURN_TO)}`}>
              <LogIn className="mr-2 h-4 w-4" />
              Login as Visitor
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 !rounded-full font-semibold">
            <Link href={`/visitor/register?returnTo=${encodeURIComponent(RETURN_TO)}`}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create account
            </Link>
          </Button>
        </CardContent>
      </Card>
      </div>
    </VisitorPortalShell>
  );
}
