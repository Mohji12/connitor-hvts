'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus, Video } from 'lucide-react';

import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getVisitorToken } from '@/lib/services/visitorPortalService';
import { VisitorAuthService } from '@/lib/services/visitorAuthService';

/** Online video appointments only — in-person booking stays under Visitor pass. */
const RETURN_TO = '/book-appointment/?mode=online';

export default function OnlineSessionPage() {
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
      <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col p-4 py-4 lg:py-10">
        <Card className="w-full border-[#001B71]/08 shadow-xl">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#4A90E2]/15 text-primary">
              <Video className="h-6 w-6" />
            </div>
            <CardTitle className="text-3xl font-bold">Online session</CardTitle>
            <CardDescription className="text-base">
              Sign in or create a profile to book a video consultation with a doctor. After approval
              you get a join link on WhatsApp.
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
