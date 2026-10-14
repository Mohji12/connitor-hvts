'use client';

import Link from 'next/link';
import { LogIn, UserPlus } from 'lucide-react';

import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const RETURN_TO = '/book-appointment';

export default function VisitorPassPage() {
  return (
    <VisitorPortalShell>
      <div className="mx-auto flex max-w-lg flex-col p-4 py-10">
      <Card className="w-full border-[#001B71]/08 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold">Visitor pass</CardTitle>
          <CardDescription className="text-base">
            Sign in if you already have an account, or create one to book your visit.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button asChild variant="brand" className="h-12 !rounded-full font-semibold">
            <Link href={`/visitor/login?returnTo=${encodeURIComponent(RETURN_TO)}`}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign in as visitor
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
