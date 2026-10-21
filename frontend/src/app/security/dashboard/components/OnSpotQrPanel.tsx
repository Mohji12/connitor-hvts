'use client';

import { BranchGateQr } from '@/components/branches/BranchGateQr';

export interface OnSpotQrPanelProps {
  branchId: string;
  branchName?: string;
  className?: string;
}

export function OnSpotQrPanel({ branchId, branchName, className }: OnSpotQrPanelProps) {
  return (
    <div className={className}>
      <BranchGateQr branchId={branchId} branchName={branchName} />
    </div>
  );
}
