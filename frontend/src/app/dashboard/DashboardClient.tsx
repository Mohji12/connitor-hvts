'use client';

import { notFound } from 'next/navigation';

import SuperAdminOverview from '@/components/overview/SuperAdminOverview';
import ChainAdminOverview from '@/components/overview/ChainAdminOverview';
import BranchAdminOverview from '@/components/overview/BranchAdminOverview';
import HospitalAdminOverview from '@/components/overview/HospitalAdminOverview';
import DepartmentAdminOverview from '@/components/overview/DepartmentAdminOverview';
import SubDepartmentAdminOverview from '@/components/overview/SubDepartmentAdminOverview';
import SecurityOverview from '@/components/overview/SecurityOverview';
import StaffOverview from '@/components/overview/StaffOverview';

export type User = {
  id: string;
  name: string;
  role: string;
  hospitalChainId?: string;
  branchId?: string;
};

export default function DashboardClient({ user }: { user: User | null }) {
  if (!user) return notFound();

  switch (user.role) {
    case 'SUPER_ADMIN':
      return <SuperAdminOverview />;
    case 'HOSPITAL_ADMIN':
      return <HospitalAdminOverview />;
    case 'DEPARTMENT_ADMIN':
      return <DepartmentAdminOverview />;
    case 'SUB_DEPARTMENT_ADMIN':
      return <SubDepartmentAdminOverview />;
    case 'CHAIN_ADMIN':
      return <ChainAdminOverview />;
    case 'BRANCH_ADMIN':
      return <BranchAdminOverview />;
    case 'SECURITY':
      return <SecurityOverview />;
    case 'STAFF':
      return <StaffOverview />;
    default:
      return notFound();
  }
}
