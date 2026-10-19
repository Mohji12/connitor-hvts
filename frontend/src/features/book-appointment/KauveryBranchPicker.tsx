'use client';

import { ChainBranchPicker } from '@/features/book-appointment/ChainBranchPicker';
import { KAUVERY_CHAIN_DISPLAY_NAME, KAUVERY_CHAIN_ID } from '@/lib/constants/kauvery';

export function KauveryBranchPicker() {
  return (
    <ChainBranchPicker
      chainId={KAUVERY_CHAIN_ID}
      displayName={KAUVERY_CHAIN_DISPLAY_NAME}
      logoSrc="/images/kauvery-hospital-logo.png"
      bookButtonClassName="bg-[#9E1B65] text-white hover:bg-[#9E1B65]/90"
    />
  );
}
