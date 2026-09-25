'use client';

import { useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/useAuthSession';
import { getDemoHomePath, IS_DEMO_MODE } from '@/lib/demo-config';

import SuperAdminUser from '@/components/users/SuperAdminUser';
import { ChainAdminUser } from '@/components/users/ChainAdminUser';
import { BranchAdminUser } from '@/components/users/BranchAdminUser';
import { HospitalAdminUser } from '@/components/users/HospitalAdminUser';
import { DepartmentAdminUser } from '@/components/users/DepartmentAdminUser';
import { SubDepartmentAdminUser } from '@/components/users/SubDepartmentAdminUser';

interface User {
  id: string;
  name: string;
  role: string;
  hospitalChainId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  subDepartmentId?: string | null;
}

function canAccessUsersPage(user: User): boolean {
  return [
    'SUPER_ADMIN',
    'CHAIN_ADMIN',
    'BRANCH_ADMIN',
    'HOSPITAL_ADMIN',
    'DEPARTMENT_ADMIN',
    'SUB_DEPARTMENT_ADMIN',
  ].includes(user.role);
}

export default function UsersPage() {
  const user = useAuthSession<User>();
  const router = useRouter();

  useEffect(() => {
    if (!user || canAccessUsersPage(user)) return;
    if (IS_DEMO_MODE) {
      router.replace(getDemoHomePath(user.role));
    }
  }, [user, router]);

  if (!user) return null;

  if (!canAccessUsersPage(user)) {
    if (IS_DEMO_MODE) return null;
    notFound();
  }

  switch (user.role) {
    case 'SUPER_ADMIN':
      return <SuperAdminUser />;
    case 'HOSPITAL_ADMIN':
      return (
        <HospitalAdminUser
          user={{
            hospitalChainId: user.hospitalChainId as string,
            branchId: user.branchId as string,
          }}
        />
      );
    case 'DEPARTMENT_ADMIN':
      return (
        <DepartmentAdminUser
          user={{
            hospitalChainId: user.hospitalChainId as string,
            branchId: user.branchId as string,
            departmentId: user.departmentId as string,
          }}
        />
      );
    case 'SUB_DEPARTMENT_ADMIN':
      return (
        <SubDepartmentAdminUser
          user={{
            hospitalChainId: user.hospitalChainId as string,
            branchId: user.branchId as string,
            departmentId: user.departmentId as string,
            subDepartmentId: user.subDepartmentId as string,
          }}
        />
      );
    case 'CHAIN_ADMIN':
      return (
        <ChainAdminUser
          user={{ ...user, hospitalChainId: user.hospitalChainId as string }}
        />
      );
    case 'BRANCH_ADMIN':
      return (
        <BranchAdminUser
          user={{
            branchId: user.branchId as string,
            hospitalChainId: user.hospitalChainId as string,
          }}
        />
      );
    default:
      if (IS_DEMO_MODE) return null;
      notFound();
  }
}
