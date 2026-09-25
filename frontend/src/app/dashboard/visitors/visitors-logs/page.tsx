'use client';

import { useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/useAuthSession';
import { getDemoHomePath, IS_DEMO_MODE } from '@/lib/demo-config';

import { SecurityVisitorLogs } from '@/components/visitors/SecurityVisitorLogs';

interface User {
  id: string;
  name: string;
  role: 'SUPER_ADMIN' | 'CHAIN_ADMIN' | 'BRANCH_ADMIN' | 'SECURITY' | 'STAFF';
  hospitalChainId?: string | null;
  branchId?: string | null;
}

function isSecurityUser(user: User): user is User & {
  branchId: string;
  hospitalChainId: string;
} {
  return (
    user.role === 'SECURITY' &&
    typeof user.branchId === 'string' &&
    typeof user.hospitalChainId === 'string'
  );
}

export default function SecurityVisitorLogsPage() {
  const user = useAuthSession<User>();
  const router = useRouter();

  useEffect(() => {
    if (!user || isSecurityUser(user)) return;

    if (IS_DEMO_MODE) {
      router.replace(getDemoHomePath(user.role));
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  if (!isSecurityUser(user)) {
    if (IS_DEMO_MODE) {
      return null;
    }

    notFound();
  }

  return (
    <SecurityVisitorLogs
      user={{
        branchId: user.branchId,
        hospitalChainId: user.hospitalChainId,
        id: user.id,
      }}
    />
  );
}
