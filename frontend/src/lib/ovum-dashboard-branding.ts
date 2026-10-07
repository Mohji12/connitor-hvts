import type { ElementType } from 'react';

import { OVUM_LOGO_SRC } from '@/components/brand/OvumHospitalLogo';
import { isOvumHospitalUser, OVUM_CHAIN_DISPLAY_NAME } from '@/lib/constants/ovum';
import type { TeamSwitcherTeam } from '@/components/sidebar/team-switcher';

type BrandingUser = {
  name: string;
  email: string;
  role: string;
  hospitalChainId?: string | null;
  hospitalChainName?: string;
  departmentName?: string | null;
  subDepartmentName?: string | null;
  branchName?: string;
  hospitalChain?: { name: string } | null;
  branch?: { name: string } | null;
};

export function buildDashboardTeamEntry(
  user: BrandingUser,
  logo: ElementType,
): TeamSwitcherTeam {
  const ovum = isOvumHospitalUser({
    hospitalChainId: user.hospitalChainId,
    email: user.email,
    hospitalChainName: user.hospitalChainName ?? user.hospitalChain?.name,
  });

  if (user.role === 'PRODUCT_ADMIN') {
    return {
      name: user.name,
      logo,
      role: user.role,
      hospitalChainName: '',
      branchName: 'All hospitals',
      brandLabel: 'Conninter',
    };
  }

  return {
    name: user.name,
    logo,
    role: user.role,
    hospitalChainName: user.hospitalChainName ?? user.hospitalChain?.name ?? '',
    branchName:
      user.subDepartmentName ??
      user.departmentName ??
      user.branchName ??
      user.branch?.name ??
      '',
    brandImageSrc: ovum ? OVUM_LOGO_SRC : undefined,
    brandLabel: ovum ? OVUM_CHAIN_DISPLAY_NAME : 'Conninter',
  };
}
