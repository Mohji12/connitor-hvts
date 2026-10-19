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
          'relative z-10 shrink-0 border-b border-slate-100 bg-white/80 backdrop-blur-md',
          // NativeBackBar already pads the status bar; avoid a double top inset.
          !nativeShell && 'pt-safe',
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-4">
          <div className="min-w-0 sm:hidden">
            <ConninterWordmark size="sm" href={homeHref} />
          </div>
          <div className="min-w-0 max-sm:hidden">
            <ConninterWordmark size="md" href={homeHref} />
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-9 px-2.5 text-primary sm:px-3"
            >
              <Link href="/portal">All portals</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground sm:h-9 sm:w-auto sm:px-3"
            >
              <Link href={homeHref} aria-label="Home" className="inline-flex items-center gap-1.5">
                <Home className="h-4 w-4 shrink-0" />
                <span className="max-sm:hidden">Home</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <div
        className={cn(
          'relative z-10 flex min-h-0 flex-1 flex-col items-center px-3 pb-safe',
          // Prefer fitting the form on one phone screen; allow scroll only if needed.
          'justify-start overflow-y-auto py-3 sm:justify-center sm:p-4 sm:py-6',
        )}
      >
        {children}
      </div>
    </div>
  );
}
