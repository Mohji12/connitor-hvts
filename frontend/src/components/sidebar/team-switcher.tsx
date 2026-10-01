'use client';

import * as React from 'react';
import Image from 'next/image';

import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export type TeamSwitcherTeam = {
  name: string;
  logo: React.ElementType;
  role: string;
  hospitalChainName: string;
  branchName: string;
  /** When set, shows hospital chain logo instead of the generic icon */
  brandImageSrc?: string;
  brandLabel?: string;
};

export function TeamSwitcher({ teams }: { teams: TeamSwitcherTeam[] }) {
  const [activeTeam] = React.useState(teams[0]);

  if (!activeTeam) {
    return null;
  }

  const brandTitle = activeTeam.brandLabel ?? 'Conninter';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-auto min-h-12 items-start overflow-visible py-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:p-2!"
            >
              {activeTeam.brandImageSrc ? (
                <div className="flex h-8 min-w-0 max-w-[8.5rem] items-center justify-center overflow-hidden rounded-md bg-white px-1">
                  <Image
                    src={activeTeam.brandImageSrc}
                    alt={brandTitle}
                    width={200}
                    height={56}
                    className="h-7 w-auto max-w-full object-contain object-left"
                  />
                </div>
              ) : (
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <activeTeam.logo className="size-4" />
                </div>
              )}
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{brandTitle}</span>
                <span className="whitespace-normal break-words text-xs leading-snug">
                  {activeTeam.branchName ||
                    activeTeam.hospitalChainName ||
                    activeTeam.name}
                </span>
                {activeTeam.role === 'DEPARTMENT_ADMIN' ||
                activeTeam.role === 'SUB_DEPARTMENT_ADMIN' ? (
                  <span className="truncate text-[10px] text-muted-foreground">
                    {activeTeam.role.replace(/_/g, ' ')}
                  </span>
                ) : null}
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
