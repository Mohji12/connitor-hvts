'use client';

import * as React from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveIndicator } from './LiveIndicator';
import { Button } from '@/components/ui/button';

export interface DashboardHeaderProps {
  title: string;
  showHamburger: boolean;
  showLiveIndicator: boolean;
  onMenuClick: () => void;
  isMenuOpen?: boolean;
  liveStatus?: boolean;
  className?: string;
  actions?: React.ReactNode;
}

export function DashboardHeader({
  title,
  showHamburger,
  showLiveIndicator,
  onMenuClick,
  isMenuOpen = false,
  liveStatus = false,
  className,
  actions,
}: DashboardHeaderProps): React.ReactElement {
  return (
    <header
      role="banner"
      className={cn(
        'fixed top-0 left-0 right-0 z-40 h-16 bg-background border-b border-border',
        className
      )}
      data-testid="dashboard-header"
    >
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-3">
          {showHamburger && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              aria-label="Security Dashboard menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              className="shrink-0"
              data-testid="hamburger-button"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          )}
          <h1 className="text-lg font-semibold text-foreground truncate">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {actions}
          {showLiveIndicator && (
            <LiveIndicator isLive={liveStatus} data-testid="header-live-indicator" />
          )}
        </div>
      </div>
    </header>
  );
}
