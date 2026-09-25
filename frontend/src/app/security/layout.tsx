'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayoutClient from '@/app/dashboard/DashboardLayoutClient';
import { useAuthSession } from '@/hooks/useAuthSession';
import { getDashboardPathForRole } from '@/lib/auth-routing';
import { ConnitorLoader } from '@/components/ConnitorLoader';

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
  branchName?: string;
  hospitalChainName?: string;
  hospitalChain: { name: string } | null;
  branch: { name: string } | null;
}

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthSession<User>();
  const router = useRouter();

  useEffect(() => {
    if (
      user &&
      user.role !== 'SECURITY' &&
      user.role !== 'SECURITY_SUPERVISOR'
    ) {
      router.replace(getDashboardPathForRole(user.role));
    }
  }, [user, router]);

  if (!user) {
    return <ConnitorLoader variant="fullscreen" message="Loading…" />;
  }

  if (user.role !== 'SECURITY' && user.role !== 'SECURITY_SUPERVISOR') {
    return <ConnitorLoader variant="fullscreen" message="Redirecting…" />;
  }

  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>;
}
