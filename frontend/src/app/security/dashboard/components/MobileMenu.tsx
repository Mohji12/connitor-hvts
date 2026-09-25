'use client';

import * as React from 'react';
import { Hospital, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  action: () => void;
  icon?: LucideIcon;
}

export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItem[];
  title?: string;
  className?: string;
  user?: {
    name: string;
    email: string;
    role: string;
    branchName?: string;
    hospitalChainName?: string;
  };
}

function getInitials(name: string): string {
  const words = name.trim().split(/[\s_]+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function formatRole(role: string): string {
  return role.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
}

export function MobileMenu({
  isOpen,
  onClose,
  items,
  // title kept in interface for backwards compatibility but not displayed
  className,
  user,
}: MobileMenuProps): React.ReactElement | null {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const firstFocusableRef = React.useRef<HTMLButtonElement>(null);
  const lastFocusableRef = React.useRef<HTMLButtonElement>(null);

  // Handle escape key to close menu
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }

      // Focus trap
      if (event.key === 'Tab' && isOpen) {
        const activeElement = document.activeElement;
        
        if (event.shiftKey && activeElement === firstFocusableRef.current) {
          event.preventDefault();
          lastFocusableRef.current?.focus();
        } else if (!event.shiftKey && activeElement === lastFocusableRef.current) {
          event.preventDefault();
          firstFocusableRef.current?.focus();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Focus first element when opened
      setTimeout(() => firstFocusableRef.current?.focus(), 0);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={cn('fixed inset-0 z-[100]', className)}
      data-testid="mobile-menu-overlay"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
        data-testid="mobile-menu-backdrop"
      />

      {/* Menu Panel */}
      <div
        ref={menuRef}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
        className="absolute right-0 top-0 h-full w-72 max-w-full bg-sidebar shadow-xl"
        data-testid="mobile-menu-panel"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-2 border-b border-sidebar-border" data-testid="mobile-menu-header">
            <div id="mobile-menu-title" className="flex items-center gap-2 pointer-events-none">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Hospital className="size-4" aria-hidden="true" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-sidebar-foreground">Conninter</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {user?.branchName || user?.hospitalChainName || 'Security'}
                </span>
              </div>
            </div>
            <Button
              ref={firstFocusableRef}
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close menu"
              className="shrink-0"
              data-testid="close-menu-button"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>

          {/* User Info Section */}
          {user && (
            <div
              className="px-4 py-3 border-b border-sidebar-border"
              data-testid="mobile-menu-user-section"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-sm font-semibold"
                  aria-hidden="true"
                >
                  {getInitials(user.name)}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <span className="truncate font-medium text-sidebar-foreground">{user.name}</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    {formatRole(user.role)}
                    {user.branchName ? ` \u2022 ${user.branchName}` : ''}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <nav className="flex-1 py-4 px-2" role="navigation" aria-label="Menu items">
            <ul className="space-y-1" role="menu">
              {items.map((item, index) => {
                const Icon = item.icon;
                const isLast = index === items.length - 1;

                return (
                  <li key={item.id} role="none">
                    <button
                      ref={isLast ? lastFocusableRef : undefined}
                      role="menuitem"
                      onClick={() => {
                        item.action();
                        onClose();
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base text-sidebar-foreground',
                        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring'
                      )}
                      data-testid={`menu-item-${item.id}`}
                    >
                      {Icon && <Icon className="h-5 w-5 text-sidebar-foreground/70" aria-hidden="true" />}
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
