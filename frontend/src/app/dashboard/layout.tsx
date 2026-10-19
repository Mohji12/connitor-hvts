'use client';

import { useEffect, useState } from 'react';
import DashboardLayoutClient from './DashboardLayoutClient';
import { useAuthSession } from '@/hooks/useAuthSession';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  hospitalChainId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  subDepartmentId?: string | null;
  departmentName?: string;
  subDepartmentName?: string;
  hospitalChain: {
    name: string;
  } | null;
  branch: {
    name: string;
  } | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthSession<User>();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (user) {
      setTimedOut(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setTimedOut(true), 10000);
    return () => window.clearTimeout(timer);
  }, [user]);

  if (!user) {
    if (timedOut) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#F7F9FC] px-6 text-center">
          <p className="max-w-sm text-base text-slate-600">
            Couldn’t open your dashboard. Your session may not have been saved in the app. Sign in
            again.
          </p>
          <Button
            type="button"
            onClick={() => {
              window.location.assign('/staff/login/');
            }}
          >
            Back to sign in
          </Button>
        </div>
      );
    }
    return (
      <ConnitorLoader
        variant="fullscreen"
        message="Loading dashboard…"
      />
    );
  }

  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>;
}
