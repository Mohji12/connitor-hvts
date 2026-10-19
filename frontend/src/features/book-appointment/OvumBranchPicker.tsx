'use client';

import { ChainBranchPicker } from '@/features/book-appointment/ChainBranchPicker';
import { OVUM_CHAIN_DISPLAY_NAME, OVUM_CHAIN_ID } from '@/lib/constants/ovum';

export function OvumBranchPicker() {
  return (
    <ChainBranchPicker
      chainId={OVUM_CHAIN_ID}
      displayName={OVUM_CHAIN_DISPLAY_NAME}
      logoSrc="/images/ovum-hospital-logo.png"
    />
  );
}
