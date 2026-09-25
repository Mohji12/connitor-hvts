'use client';

import { useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/useAuthSession';
import { getDemoHomePath, IS_DEMO_MODE } from '@/lib/demo-config';
import { SuperAdminBranches } from '@/components/branches/SuperAdminBranches';
import { ChainAdminBranches } from '@/components/branches/ChainAdminBranches';

interface User {
  id: string;
  name: string;
  role: 'SUPER_ADMIN' | 'CHAIN_ADMIN' | 'BRANCH_ADMIN' | 'SECURITY' | 'STAFF';
  hospitalChainId?: string;
}

function canAccessBranchesPage(user: User): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'CHAIN_ADMIN') return typeof user.hospitalChainId === 'string';
  return false;
}

export default function BranchesPage() {
  const user = useAuthSession<User>();
  const router = useRouter();

  useEffect(() => {
    if (!user || canAccessBranchesPage(user)) return;

    if (IS_DEMO_MODE) {
      router.replace(getDemoHomePath(user.role));
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  if (!canAccessBranchesPage(user)) {
    if (IS_DEMO_MODE) {
      return null;
    }

    notFound();
  }

  switch (user.role) {
    case 'SUPER_ADMIN':
      return <SuperAdminBranches />;
    case 'CHAIN_ADMIN':
      return (
        <ChainAdminBranches
          user={{ ...user, hospitalChainId: user.hospitalChainId as string }}
        />
      );
    default:
      if (IS_DEMO_MODE) {
        return null;
      }

      notFound();
  }
}
