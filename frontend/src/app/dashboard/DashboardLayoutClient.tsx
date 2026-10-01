'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { RoleSidebar } from '@/components/sidebar/RoleSidebar';
import { useResponsive } from '@/hooks/use-mobile';
import { TeamSwitcher } from '@/components/sidebar/team-switcher';
import { Hospital, Maximize, Shrink } from 'lucide-react';
import { OvumHospitalLogo } from '@/components/brand/OvumHospitalLogo';
import { buildDashboardTeamEntry } from '@/lib/ovum-dashboard-branding';
import { isOvumHospitalUser } from '@/lib/constants/ovum';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { DemoRoleSwitcher } from '@/components/demo/DemoRoleSwitcher';
import { RoleRoutePrefetcher } from '@/components/navigation/RoleRoutePrefetcher';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  hospitalChainId?: string | null;
  departmentName?: string;
  subDepartmentName?: string;
  hospitalChainName?: string;
  branchName?: string;
  hospitalChain: { name: string } | null;
  branch: { name: string } | null;
}

export default function DashboardLayoutClient({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const { isMobile, isTablet } = useResponsive();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const isCompactHeader = isMobile || isTablet;

  const { notifications, unreadCount, markAsRead, handleNotificationView } =
    useNotifications(user);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement)
      document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  };

  useEffect(() => {
    const onFullScreenChange = () =>
      setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, []);

  const teamsData = [buildDashboardTeamEntry(user, Hospital)];
  const showOvumBrand = isOvumHospitalUser({
    hospitalChainId: user.hospitalChainId,
    email: user.email,
    hospitalChainName: user.hospitalChainName ?? user.hospitalChain?.name,
  });

  return (
    <SidebarProvider>
      <RoleRoutePrefetcher role={user.role} />
      <Suspense fallback={null}>
        <RoleSidebar user={user} />
      </Suspense>
      <SidebarInset data-testid="dashboard-container" className="min-w-0">
        <header className="flex items-center gap-1 sm:gap-2 min-h-14 h-auto px-2 sm:px-4 py-1 border-b border-[#001B71]/08 bg-white shrink-0">
          {!isCompactHeader ? <SidebarTrigger className="mr-2 shrink-0" /> : null}
          <div className="min-w-0 flex-1 flex items-center gap-3">
            {showOvumBrand && !isCompactHeader ? (
              <OvumHospitalLogo href="/dashboard/" size="sm" />
            ) : null}
            {isCompactHeader ? <TeamSwitcher teams={teamsData} /> : null}
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <DemoRoleSwitcher />
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onNotificationView={handleNotificationView}
            />
            {!isMobile ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullScreen}
                aria-label="Toggle Fullscreen"
                className="shrink-0"
              >
                {isFullScreen ? (
                  <Shrink className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </Button>
            ) : null}
          </div>
        </header>

        <main className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
