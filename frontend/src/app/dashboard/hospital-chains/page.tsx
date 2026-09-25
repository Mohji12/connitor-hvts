'use client';

import { useAuthSession } from '@/hooks/useAuthSession';
import SuperAdminHospitalChain from '@/components/hospitalChain/SuperAdminHospitalChain';

interface User {
  id: string;
  name: string;
  role: 'SUPER_ADMIN' | 'CHAIN_ADMIN' | 'BRANCH_ADMIN' | 'SECURITY' | 'STAFF';
}

export default function HospitalChainPage() {
  const user = useAuthSession<User>({ requiredRole: 'SUPER_ADMIN' });

  if (!user || user.role !== 'SUPER_ADMIN') {
    return null;
  }

  return <SuperAdminHospitalChain />;
}
