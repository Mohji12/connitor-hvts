'use client';

import { notFound } from 'next/navigation';
import { useAuthSession } from '@/hooks/useAuthSession';

import SuperAdminSetting from '@/components/settings/SuperAdminSetting';
import ChainAdminSetting from '@/components/settings/ChainAdminSetting';
import BranchAdminSetting from '@/components/settings/BranchAdminSetting';
import SecuritySetting from '@/components/settings/SecuritySetting';
import StaffSetting from '@/components/settings/StaffSetting';
import HierarchyAdminSetting from '@/components/settings/HierarchyAdminSetting';

interface User {
  id: string;
  name: string;
  role:
    | 'SUPER_ADMIN'
    | 'CHAIN_ADMIN'
    | 'BRANCH_ADMIN'
    | 'HOSPITAL_ADMIN'
    | 'DEPARTMENT_ADMIN'
    | 'SUB_DEPARTMENT_ADMIN'
    | 'SECURITY'
    | 'SECURITY_SUPERVISOR'
    | 'STAFF';
}

export default function SettingPage() {
  const user = useAuthSession<User>();

  if (!user) {
    return null;
  }

  switch (user.role) {
    case 'SUPER_ADMIN':
      return <SuperAdminSetting />;
    case 'CHAIN_ADMIN':
      return <ChainAdminSetting />;
    case 'BRANCH_ADMIN':
    case 'HOSPITAL_ADMIN':
      return <BranchAdminSetting />;
    case 'DEPARTMENT_ADMIN':
    case 'SUB_DEPARTMENT_ADMIN':
      return <HierarchyAdminSetting role={user.role} />;
    case 'SECURITY':
    case 'SECURITY_SUPERVISOR':
      return <SecuritySetting />;
    case 'STAFF':
      return <StaffSetting />;
    default:
      notFound();
  }
}
