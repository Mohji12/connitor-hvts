'use client';

import type { ReactElement } from 'react';
import { motion } from 'framer-motion';
import { Truck, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ShowcaseModule = 'visitor' | 'delivery';

export const SHOWCASE_MODULES: ShowcaseModule[] = ['visitor', 'delivery'];

const moduleMeta: Record<ShowcaseModule, { label: string; icon: LucideIcon; active: string; bar: string }> = {
  visitor: { label: 'Visitor visits', icon: Users, active: 'bg-[#001B71] text-white', bar: 'bg-[#4A90E2]' },
  delivery: { label: 'Deliveries', icon: Truck, active: 'bg-teal-600 text-white', bar: 'bg-amber-400' },
};

interface ModuleToggleProps {
  active: ShowcaseModule;
  onSelect: (module: ShowcaseModule) => void;
  running: boolean;
  cycleKey: string;
  intervalMs: number;
  className?: string;
  ariaLabel?: string;
}

export function ModuleToggle({
  active,
  onSelect,
  running,
  cycleKey,
  intervalMs,
  className,
  ariaLabel = 'Choose module',
}: ModuleToggleProps): ReactElement {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-1 rounded-full border bg-background p-1 shadow-sm', className)}
    >
      {SHOWCASE_MODULES.map((module) => {
        const meta = moduleMeta[module];
        const Icon = meta.icon;
        const isActive = module === active;
        return (
          <button
            key={module}
            type="button"
            role="tab"
            aria-selected={isActive}
            suppressHydrationWarning
            onClick={() => onSelect(module)}
            className={cn(
              'relative inline-flex items-center gap-1.5 overflow-hidden rounded-full px-3.5 py-1.5 font-sans text-xs font-medium transition-colors',
              isActive ? meta.active : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
            {isActive && running && (
              <motion.span
                key={cycleKey}
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: intervalMs / 1000, ease: 'linear' }}
                className={cn('absolute bottom-0 left-0 h-[2px] w-full origin-left', meta.bar)}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
