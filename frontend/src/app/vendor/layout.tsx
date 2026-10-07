'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  distributorId?: string;
  hospitalChain: { name: string } | null;
  branch: { name: string } | null;
}

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();
  const isPublicRegister = pathname?.startsWith('/vendor/register') ?? false;

  // Public onboarding — no auth chrome
  if (isPublicRegister) {
    return <>{children}</>;
  }

  return <VendorPortalShell>{children}</VendorPortalShell>;
}

function VendorPortalShell({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const user = useAuthSession<User>();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'DISTRIBUTOR') {
      router.replace(getDashboardPathForRole(user.role));
    }
  }, [user, router]);

  if (!user) {
    return <ConnitorLoader variant="fullscreen" message="Loading…" />;
  }

  if (user.role !== 'DISTRIBUTOR') {
    return <ConnitorLoader variant="fullscreen" message="Redirecting…" />;
  }

  const layoutUser = {
    ...user,
    name: user.name || user.email || 'Distributor',
    phone: user.phone || '',
    hospitalChain: user.hospitalChain ?? null,
    branch: user.branch ?? null,
  };

  return <DashboardLayoutClient user={layoutUser}>{children}</DashboardLayoutClient>;
}
