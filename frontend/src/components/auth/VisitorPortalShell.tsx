'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarPlus, ChevronLeft, Home, LayoutGrid, UserRound, Wallet } from 'lucide-react';

import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { BottomTabBar, type MobileTab } from '@/components/mobile/BottomTabBar';
import { Button } from '@/components/ui/button';
import { goBackInApp, useRegisterTopBar } from '@/lib/app-back';
import { appSafeHomeHref } from '@/lib/native-home-guard';
import { cn } from '@/lib/utils';

type VisitorPortalShellProps = {
  children: React.ReactNode;
  /** Optional right-side header actions besides Home */
  headerExtra?: React.ReactNode;
  /** Signed-in visitor pages: show app-style bottom tabs on phones. */
  appTabs?: boolean;
};

const VISITOR_TABS: MobileTab[] = [
  { label: 'Home', href: '/visitor/dashboard', icon: Home },
  { label: 'Book', href: '/book-appointment', icon: CalendarPlus },
  { label: 'Wallet', href: '/visitor/wallet', icon: Wallet },
  { label: 'Profile', href: '/visitor/dashboard/profile', icon: UserRound },
];

function normalize(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

/** Shared navy portal chrome for visitor auth + dashboard surfaces. */
export function VisitorPortalShell({
  children,
  headerExtra,
  appTabs = false,
}: VisitorPortalShellProps) {
  const pathname = normalize(usePathname() ?? '');
  const router = useRouter();
  const [homeHref, setHomeHref] = useState('/');
  useRegisterTopBar();

  useEffect(() => {
    setHomeHref(appSafeHomeHref());
  }, []);

  return (
    <div className="relative min-h-screen w-full max-w-[100vw] overflow-x-clip bg-[#F7F9FC]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#4A90E2]/12 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#001B71]/08 blur-3xl" />
      </div>

      <header className="pt-safe relative z-10 sticky top-0 border-b border-[#001B71]/08 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full min-w-0 max-w-6xl items-center gap-1 px-2 lg:h-auto lg:gap-3 lg:px-6 lg:py-4">
          <button
            type="button"
            aria-label="Back"
            onClick={() => goBackInApp(router)}
            className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary active:bg-primary/10 lg:hidden"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <span className="min-w-0 lg:hidden">
            <ConninterWordmark size="sm" href={homeHref} />
          </span>
          <span className="hidden min-w-0 lg:inline-flex">
            <ConninterWordmark size="md" href={homeHref} />
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-0.5 lg:gap-2">
            {headerExtra}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden h-9 text-primary lg:inline-flex"
            >
              <Link href="/portal" aria-label="Portals">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Portals
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden h-9 text-muted-foreground lg:inline-flex"
            >
              <Link href={homeHref} aria-label="Home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className={cn('relative z-10', appTabs && 'max-lg:pb-[calc(4.5rem+env(safe-area-inset-bottom))]')}>{children}</div>

      {appTabs ? (
        <BottomTabBar
          className="lg:hidden"
          tabs={VISITOR_TABS}
          isActive={(href) => normalize(href) === pathname}
        />
      ) : null}
    </div>
  );
}
