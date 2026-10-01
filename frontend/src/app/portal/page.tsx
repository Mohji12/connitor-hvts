'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowRight } from 'lucide-react';

import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { Button } from '@/components/ui/button';

function PortalContent() {
  const searchParams = useSearchParams();
  const intent = searchParams.get('intent');
  const preferRegister = intent === 'register';

  const primaryHref = preferRegister ? '/visitor/register' : '/visitor/login';
  const primaryLabel = preferRegister ? 'Create visitor account' : 'Visitor sign in';
  const secondaryHref = preferRegister ? '/visitor/login' : '/visitor/register';
  const secondaryLabel = preferRegister ? 'Already have an account? Sign in' : 'Create visitor account';

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#4A90E2]/15 blur-3xl" />
        <div className="absolute -right-16 top-40 h-80 w-80 rounded-full bg-[#001B71]/10 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-[#001B71]/08 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <ConninterWordmark size="md" />
          <Button asChild variant="ghost" size="sm" className="text-primary">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 max-w-xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#4A90E2]">
            Visitors
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
            Sign in to book visits
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            {preferRegister
              ? 'Create a visitor account to book hospital appointments and track your visits.'
              : 'Use your visitor account to book hospital appointments and track your visits.'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#001B71]/08 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-foreground">Visitor portal</h2>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            Sign in or create an account to book hospital visits and track appointments.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild variant="brand" className="w-full !rounded-full font-semibold sm:w-auto sm:min-w-[200px]">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full !rounded-full sm:w-auto">
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F9FC] text-muted-foreground">
          Loading…
        </div>
      }
    >
      <PortalContent />
    </Suspense>
  );
}
