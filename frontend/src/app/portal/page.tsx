'use client';

import Link from 'next/link';
import { Suspense } from 'react';

import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { PortalHub } from '@/components/auth/PortalHub';
import { Button } from '@/components/ui/button';

function PortalContent() {
  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#4A90E2]/15 blur-3xl" />
        <div className="absolute -right-16 top-40 h-80 w-80 rounded-full bg-[#001B71]/10 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-[#001B71]/08 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <ConninterWordmark size="md" />
          <Button asChild variant="ghost" size="sm" className="text-primary">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#4A90E2]">
            Conninter portals
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
            Visitor &amp; attendant access
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Hospital staff and delivery partners should use their direct login links. Choose an option below for visitors
            or family visit passes.
          </p>
        </div>

        <PortalHub />
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
