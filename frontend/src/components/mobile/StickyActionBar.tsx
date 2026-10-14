import * as React from 'react';
import { cn } from '@/lib/utils';

interface StickyActionBarProps {
  children: React.ReactNode;
  /** Sit above the bottom tab bar instead of the screen edge. */
  aboveTabBar?: boolean;
  className?: string;
}

/** Fixed bottom action area on phones; inline on desktop. */
export function StickyActionBar({ children, aboveTabBar, className }: StickyActionBarProps): React.ReactElement {
  return (
    <div
      className={cn(
        'fixed inset-x-0 z-30 flex gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none',
        aboveTabBar
          ? 'bottom-[calc(4rem+env(safe-area-inset-bottom))]'
          : 'bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:pb-0',
        className,
      )}
    >
      {children}
    </div>
  );
}
