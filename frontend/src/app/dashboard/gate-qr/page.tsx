'use client';

import { BranchGateQr } from '@/components/branches/BranchGateQr';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { useAuthSession } from '@/hooks/useAuthSession';

type SessionUser = {
  role?: string;
  branchId?: string | null;
  branchName?: string | null;
  hospitalChainId?: string | null;
  branch?: { name?: string | null } | null;
};

const ALLOWED = new Set(['HOSPITAL_ADMIN', 'BRANCH_ADMIN', 'CHAIN_ADMIN', 'SUPER_ADMIN']);

export default function HospitalGateQrPage(): React.ReactElement {
  const user = useAuthSession<SessionUser>();

  if (!user) {
    return <ConnitorLoader variant="section" message="Loading desk QR…" className="min-h-[50vh] py-16" />;
  }

  if (!ALLOWED.has(user.role ?? '') || !user.branchId) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <p className="text-sm text-muted-foreground">
          This hospital desk QR is available for hospital and branch admins assigned to a centre.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4 lg:p-6">
      <div className="min-w-0 max-lg:hidden">
        <h1 className="text-2xl font-bold">Gate QR</h1>
        <p className="text-sm text-muted-foreground">
          Download this code and send it to security. Visitors and distributors scan it at the desk.
        </p>
      </div>
      <BranchGateQr
        branchId={user.branchId}
        branchName={user.branchName ?? user.branch?.name}
        chainId={user.hospitalChainId}
        canRefresh={user.role === 'HOSPITAL_ADMIN' || user.role === 'BRANCH_ADMIN' || user.role === 'CHAIN_ADMIN' || user.role === 'SUPER_ADMIN'}
      />
    </div>
  );
}
