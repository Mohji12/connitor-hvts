'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { Button } from '@/components/ui/button';
import { PreRegistrationWizardLoader } from '@/features/visitor-pre-registration/wizard/PreRegistrationWizardLoader';

export default function VisitorRegisterPage() {
  return (
    <VisitorPortalShell
      headerExtra={
        <Button asChild variant="ghost" size="sm" className="hidden text-muted-foreground sm:inline-flex">
          <Link href="/visitor/login">Already registered? Sign in</Link>
        </Button>
      }
    >
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Suspense
          fallback={
            <p className="py-16 text-center text-muted-foreground">Loading registration form…</p>
          }
        >
          <PreRegistrationWizardLoader />
        </Suspense>
      </main>
    </VisitorPortalShell>
  );
}
