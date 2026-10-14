'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, CalendarPlus, Home, LayoutGrid, UserRound, Wallet } from 'lucide-react';

import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { BottomTabBar, type MobileTab } from '@/components/mobile/BottomTabBar';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="relative min-h-screen w-full max-w-[100vw] overflow-x-clip bg-[#F7F9FC]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#4A90E2]/12 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#001B71]/08 blur-3xl" />
      </div>

      <header className="pt-safe relative z-10 sticky top-0 border-b border-[#001B71]/08 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex w-full min-w-0 max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-4">
          <ConninterWordmark size="md" className="min-w-0 shrink" />
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            {headerExtra}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                'h-9 w-9 p-0 text-primary sm:h-9 sm:w-auto sm:px-3',
                appTabs && 'max-lg:hidden',
              )}
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
              className={cn(
                'h-9 w-9 p-0 text-muted-foreground sm:h-9 sm:w-auto sm:px-3',
                appTabs && 'max-lg:hidden',
              )}
            >
              <Link href="/" aria-label="Home">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
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
