'use client';

import Link from 'next/link';
import { ArrowLeft, LayoutGrid } from 'lucide-react';

import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { Button } from '@/components/ui/button';

type VisitorPortalShellProps = {
  children: React.ReactNode;
  /** Optional right-side header actions besides Home */
  headerExtra?: React.ReactNode;
};

/** Shared navy portal chrome for visitor auth + dashboard surfaces. */
export function VisitorPortalShell({
  children,
  headerExtra,
}: VisitorPortalShellProps) {
  return (
    <div className="relative min-h-screen w-full max-w-[100vw] overflow-x-clip bg-[#F7F9FC]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#4A90E2]/12 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#001B71]/08 blur-3xl" />
      </div>

      <header className="relative z-10 sticky top-0 border-b border-[#001B71]/08 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex w-full min-w-0 max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-4">
          <ConninterWordmark size="md" className="min-w-0 shrink" />
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            {headerExtra}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-primary sm:h-9 sm:w-auto sm:px-3"
            >
              <Link href="/portal" aria-label="Portals">
                <LayoutGrid className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Portals</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-muted-foreground sm:h-9 sm:w-auto sm:px-3"
            >
              <Link href="/" aria-label="Home">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
