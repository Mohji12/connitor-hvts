'use client';

import { notFound } from 'next/navigation';
import { useAuthSession } from '@/hooks/useAuthSession';

import { BranchAdminVisitor } from '@/components/visitors/BranchAdminVisitors';

interface User {
  id: string;
  name: string;
  role: 'SUPER_ADMIN' | 'CHAIN_ADMIN' | 'BRANCH_ADMIN' | 'HOSPITAL_ADMIN' | 'SECURITY' | 'STAFF';
  hospitalChainId?: string;
  branchId?: string;
}

export default function VisitorsPage() {
  const user = useAuthSession<User>();

  if (!user) {
    return null;
  }

  if (user.role !== 'BRANCH_ADMIN' && user.role !== 'HOSPITAL_ADMIN') {
    notFound();
  }

  if (
    typeof user.branchId !== 'string' ||
    typeof user.hospitalChainId !== 'string'
  ) {
    notFound();
  }

  return (
    <BranchAdminVisitor
      user={{
        branchId: user.branchId,
        hospitalChainId: user.hospitalChainId,
      }}
    />
  );
}
