'use client';

import * as React from 'react';
import Link from 'next/link';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MobileTab {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface BottomTabBarProps {
  tabs: MobileTab[];
  isActive: (href: string) => boolean;
  /** Shows a "More" button when provided. */
  onMore?: () => void;
  moreActive?: boolean;
  className?: string;
}

const tabClass =
  'flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors';

export function BottomTabBar({
  tabs,
  isActive,
  onMore,
  moreActive,
  className,
}: BottomTabBarProps): React.ReactElement {
  return (
    <nav
      aria-label="Main"
      className={cn(
        'pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md',
        className,
      )}
    >
      <div className="flex h-16 items-stretch">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch
              aria-current={active ? 'page' : undefined}
              className={cn(tabClass, active ? 'text-primary' : 'text-muted-foreground')}
            >
              <span
                className={cn(
                  'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                  active && 'bg-primary/10',
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className="w-full truncate text-center">{tab.label}</span>
            </Link>
          );
        })}
        {onMore ? (
          <button
            type="button"
            onClick={onMore}
            className={cn(tabClass, moreActive ? 'text-primary' : 'text-muted-foreground')}
          >
            <span
              className={cn(
                'flex h-7 w-12 items-center justify-center rounded-full',
                moreActive && 'bg-primary/10',
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
            </span>
            <span>More</span>
          </button>
        ) : null}
      </div>
    </nav>
  );
}
