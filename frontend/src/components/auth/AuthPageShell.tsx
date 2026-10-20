'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';

import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { Button } from '@/components/ui/button';
import { appSafeHomeHref } from '@/lib/native-home-guard';
import { isNativeApp } from '@/lib/platform';
import { cn } from '@/lib/utils';

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  const [homeHref, setHomeHref] = useState('/');
  const [nativeShell, setNativeShell] = useState(false);

  useEffect(() => {
    setHomeHref(appSafeHomeHref());
    setNativeShell(isNativeApp());
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#F7F9FC]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#4A90E2]/12 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#001B71]/08 blur-3xl" />
      </div>

      <header
        className={cn(
          'relative z-10 min-w-0 shrink-0 overflow-hidden border-b border-slate-100 bg-white/80 backdrop-blur-md',
          'pt-safe',
        )}
      >
        <div className="mx-auto flex h-12 min-w-0 max-w-6xl items-center justify-end gap-2 px-3 lg:h-auto lg:justify-between lg:px-6 lg:py-4">
          {/* Phone: skip the wordmark — the sign-in card already has the logo. */}
          <div className="min-w-0 max-lg:hidden">
            <ConninterWordmark size="md" href={homeHref} />
          </div>
          <div className="flex min-w-0 items-center justify-end gap-1">
            {!nativeShell ? (
              <Button asChild variant="ghost" size="sm" className="hidden h-9 shrink-0 px-2.5 text-primary lg:inline-flex">
                <Link href="/portal">All portals</Link>
              </Button>
            ) : null}
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 text-muted-foreground lg:h-9 lg:w-auto lg:px-3"
            >
              <Link href={homeHref} aria-label="Home" className="inline-flex items-center justify-center gap-1.5">
                <Home className="h-5 w-5 shrink-0" />
                <span className="hidden lg:inline">Home</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <div
        className={cn(
          'relative z-10 flex min-h-0 min-w-0 flex-1 flex-col items-center overflow-x-hidden px-3 pb-safe',
          // Prefer fitting the form on one phone screen; allow scroll only if needed.
          'justify-start overflow-y-auto py-3 lg:justify-center lg:p-4 lg:py-6',
        )}
      >
        {children}
      </div>
    </div>
  );
}
