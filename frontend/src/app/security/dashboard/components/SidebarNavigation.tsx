'use client';

import * as React from 'react';
import { Hospital, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface SidebarNavigationProps {
  items: NavigationItem[];
  activeItem?: string;
  onItemClick: (item: NavigationItem) => void;
  className?: string;
  user?: {
    name: string;
    email: string;
    role: string;
    branchName?: string;
    hospitalChainName?: string;
  };
  onLogout?: () => void;
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

export function SidebarNavigation({
  items,
  activeItem,
  onItemClick,
  className,
  user,
  onLogout,
}: SidebarNavigationProps): React.ReactElement {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-30 hidden lg:flex flex-col',
        className
      )}
      data-testid="sidebar-navigation"
      aria-label="Sidebar navigation"
    >
      <div className="p-2 border-b border-sidebar-border" data-testid="sidebar-header">
        <div className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm h-12">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Hospital className="size-4" aria-hidden="true" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">Conninter</span>
            <span className="truncate text-xs">
              {user?.branchName || user?.hospitalChainName || 'Security'}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4" role="navigation" aria-label="Main navigation">
        <ul className="space-y-1 px-2" role="menubar">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <li key={item.id} role="none">
                <button
                  role="menuitem"
                  onClick={() => onItemClick(item)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                  data-testid={`nav-item-${item.id}`}
                >
                  <Icon
                    className={cn('h-5 w-5', isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/70')}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {user && (
        <div
          className="border-t border-sidebar-border p-4"
          data-testid="sidebar-user-section"
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
          {onLogout && (
            <button
              onClick={onLogout}
              className={cn(
                'mt-3 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring'
              )}
              data-testid="sidebar-logout-button"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5 text-sidebar-foreground/70" aria-hidden="true" />
              <span>Log out</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
