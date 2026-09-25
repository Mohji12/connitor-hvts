'use client';

import * as React from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { NavUser } from './nav-user';

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path;
}

function navHrefMatches(pathname: string, search: string, href: string): boolean {
  const [hrefPath, hrefQuery = ''] = href.split('?');
  const currentPath = normalizePath(pathname);
  const targetPath = normalizePath(hrefPath);

  if (currentPath !== targetPath) {
    return false;
  }

  if (!hrefQuery) {
    return !new URLSearchParams(search).get('tab');
  }

  const expected = new URLSearchParams(hrefQuery);
  const current = new URLSearchParams(search);
  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) {
      return false;
    }
  }
  return true;
}

export function MobileBottomNav({
  items,
  iconMap,
  pathname,
  search = '',
  user,
}: {
  items: { label: string; href: string; icon: string }[];
  iconMap: Record<string, React.ElementType>;
  pathname: string;
  search?: string;
  user: {
    name: string;
    email: string;
    avatar: string;
    role: string;
    branchName: string;
    hospitalChainName: string;
  };
}) {
  const settingsItem = items.find(
    (item) => item.icon === 'settings' || item.href.includes('/settings'),
  );
  const primaryItems = items.filter((item) => item !== settingsItem);
  const mainWithoutSettings = primaryItems.slice(0, settingsItem ? 2 : 3);
  const mainItems = settingsItem
    ? [...mainWithoutSettings, settingsItem]
    : primaryItems.slice(0, 3);
  const moreItems = settingsItem
    ? primaryItems.slice(2)
    : primaryItems.slice(3);
  // Always show More on mobile so profile menu (Settings, logout) stays reachable.
  const showMore = true;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 bg-sidebar border-t border-sidebar-border lg:hidden pb-[env(safe-area-inset-bottom)]">
      {mainItems.map((item) => {
        const Icon = iconMap[item.icon];
        const isActive = navHrefMatches(pathname, search, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs ${
              isActive
                ? 'text-sidebar-primary'
                : 'text-sidebar-foreground/70 hover:text-sidebar-primary'
            }`}
          >
            {Icon && <Icon className="size-6" />}
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
      {showMore && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex-1 flex flex-col items-center justify-center gap-1 text-xs text-sidebar-foreground/70 hover:text-primary">
              <MoreHorizontal className="size-6" />
              <span>More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="center" className="w-56 p-0">
            {moreItems.length > 0 ? (
              <>
                <div className="py-1">
                  {moreItems.map((item) => {
                    const Icon = iconMap[item.icon];
                    return (
                      <DropdownMenuItem asChild key={item.href}>
                        <Link href={item.href} prefetch className="flex items-center gap-2">
                          {Icon && <Icon className="size-4" />}
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
                <DropdownMenuSeparator />
              </>
            ) : null}
            {/* NavUser at the bottom */}
            <div className="px-2 pb-2">
              <NavUser user={user} />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
}
