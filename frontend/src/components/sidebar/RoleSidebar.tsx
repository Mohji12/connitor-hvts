'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { sidebarConfig } from '@/lib/sidebar-config';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { TeamSwitcher } from './team-switcher';
import { NavUser } from './nav-user';
import Link from 'next/link';
import {
  LayoutDashboard,
  Hospital,
  Building,
  Users,
  Settings,
  UserPlus,
  Book,
  Calendar,
  Layers,
  GitBranch,
  IdCard,
  Truck,
  Package,
  Wallet,
} from 'lucide-react';
import { useResponsive } from '@/hooks/use-mobile';
import { MobileBottomNav } from './mobile-bottom-nav';

// Map icon string to Lucide icon component
const iconMap = {
  dashboard: LayoutDashboard,
  hospital: Hospital,
  building: Building,
  users: Users,
  settings: Settings,
  'user-plus': UserPlus,
  book: Book,
  calendar: Calendar,
  layers: Layers,
  'git-branch': GitBranch,
  'id-card': IdCard,
  truck: Truck,
  package: Package,
  wallet: Wallet,
};

// Define User Profile structure from API
interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  hospitalChainName?: string;
  branchName?: string;
  departmentName?: string;
  subDepartmentName?: string;
  hospitalChain?: {
    name: string;
  } | null;
  branch?: {
    name: string;
  } | null;
}

interface RoleSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: UserProfile;
}

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path;
}

function navHrefMatches(
  pathname: string,
  searchParams: URLSearchParams,
  href: string,
): boolean {
  const [hrefPath, hrefQuery = ''] = href.split('?');
  const currentPath = normalizePath(pathname);
  const targetPath = normalizePath(hrefPath);

  if (currentPath !== targetPath) {
    return false;
  }

  if (!hrefQuery) {
    return !searchParams.get('tab');
  }

  const expected = new URLSearchParams(hrefQuery);
  for (const [key, value] of expected.entries()) {
    if (searchParams.get(key) !== value) {
      return false;
    }
  }
  return true;
}

export function RoleSidebar(props: RoleSidebarProps) {
  const { user } = props;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isMobile, isTablet } = useResponsive();

  if (!user || !user.role) return null;

  const roleItems = sidebarConfig[user.role as keyof typeof sidebarConfig];
  const items = roleItems ?? [
    { label: 'Overview', href: '/dashboard', icon: 'dashboard' },
    { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
  ];

  // Dynamic teamsData based on user info
  const teamsData = [
    {
      name: user.name,
      logo: Hospital,
      role: user.role,
      hospitalChainName:
        user.hospitalChainName ?? user.hospitalChain?.name ?? '',
      branchName:
        user.subDepartmentName ??
        user.departmentName ??
        user.branchName ??
        user.branch?.name ??
        '',
    },
  ];

  // Only show sidebar on desktop
  if (!(isMobile || isTablet)) {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <TeamSwitcher teams={teamsData} />
        </SidebarHeader>
        <SidebarContent className="p-2 mt-4">
          <SidebarMenu>
            {items.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap];
              const isActive = navHrefMatches(pathname, searchParams, item.href);
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-xs hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground'
                        : ''
                    }`}
                  >
                    <Link
                      href={item.href}
                      prefetch
                      className="flex items-center gap-3 w-full"
                    >
                      <span className="flex items-center justify-center w-6 h-6">
                        {Icon && <Icon className="size-5" />}
                      </span>
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <NavUser
            user={{
              name: user.name,
              email: user.email,
              avatar: user.name
                ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user.name,
                  )}`
                : '',
              role: user.role,
              branchName: user.branchName ?? user.branch?.name ?? '',
              hospitalChainName:
                user.hospitalChainName ?? user.hospitalChain?.name ?? '',
            }}
          />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    );
  }

  // On mobile/tablet, show only bottom nav
  return (
    <>
      <MobileBottomNav
        items={items}
        iconMap={iconMap}
        pathname={pathname}
        search={searchParams.toString() ? `?${searchParams.toString()}` : ''}
        user={{
          name: user.name,
          email: user.email,
          avatar: user.name
            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user.name,
              )}`
            : '',
          role: user.role,
          branchName: user.branchName ?? user.branch?.name ?? '',
          hospitalChainName:
            user.hospitalChainName ?? user.hospitalChain?.name ?? '',
        }}
      />
    </>
  );
}
