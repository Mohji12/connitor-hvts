'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface TabConfig {
  id: 'check-in' | 'appointments' | 'logs';
  label: string;
  icon: LucideIcon;
  ariaLabel: string;
}

export interface BottomNavigationProps {
  activeTab: 'check-in' | 'appointments' | 'logs';
  onTabChange: (tab: 'check-in' | 'appointments' | 'logs') => void;
  tabs: TabConfig[];
  className?: string;
}

export function BottomNavigation({
  activeTab,
  onTabChange,
  tabs,
  className,
}: BottomNavigationProps): React.ReactElement {
  const handleTabClick = (tabId: 'check-in' | 'appointments' | 'logs') => {
    onTabChange(tabId);
  };

  return (
    <nav
      role="navigation"
      aria-label="Dashboard navigation"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 h-16 bg-sidebar border-t border-sidebar-border lg:hidden',
        className
      )}
      data-testid="bottom-navigation"
    >
      <div className="flex h-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const contentId = `${tab.id}-tab-content`;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls={contentId}
              aria-label={tab.ariaLabel}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-inset',
                isActive
                  ? 'text-primary border-t-2 border-primary -mt-[2px]'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
              )}
              data-testid={`tab-${tab.id}`}
            >
              <Icon
                className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-sidebar-foreground/70')}
                aria-hidden="true"
              />
              <span className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-sidebar-foreground/70')}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
