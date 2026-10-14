'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, LogOut, type LucideIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export interface MoreItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface MoreGroup {
  title?: string;
  items: MoreItem[];
}

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: MoreGroup[];
  user?: { name: string; subtitle?: string };
  onLogout?: () => void;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function MoreSheet({ open, onOpenChange, groups, user, onLogout }: MoreSheetProps): React.ReactElement {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="pb-safe max-h-[85dvh] gap-0 rounded-t-2xl p-0">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted" aria-hidden />
        <SheetHeader className="px-4 pb-2 pt-3">
          <SheetTitle className="m-title">More</SheetTitle>
          <SheetDescription className="sr-only">Other pages and your account</SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-3 pb-4">
          {user ? (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#F7F9FC] p-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-sm text-primary-foreground">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="m-section truncate">{user.name}</p>
                {user.subtitle ? <p className="m-meta truncate">{user.subtitle}</p> : null}
              </div>
            </div>
          ) : null}
          {groups.map((group, index) => (
            <div key={group.title ?? index} className="mb-3">
              {group.title ? (
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </p>
              ) : null}
              <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href} className="border-b border-slate-100 last:border-b-0">
                      <Link
                        href={item.href}
                        onClick={() => onOpenChange(false)}
                        className="flex min-h-12 items-center gap-3 px-3 active:bg-muted"
                      >
                        <Icon className="h-5 w-5 shrink-0 text-primary" />
                        <span className="m-body flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-red-100 bg-white px-3 text-left text-sm font-medium text-red-600 active:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
