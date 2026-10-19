import { OVUM_BOOK_PATH, OVUM_CHAIN_DISPLAY_NAME, OVUM_CHAIN_ID } from '@/lib/constants/ovum';
import {
  KAUVERY_BOOK_PATH,
  KAUVERY_CHAIN_DISPLAY_NAME,
  KAUVERY_CHAIN_ID,
} from '@/lib/constants/kauvery';

export type PartnerHospital = {
  chainId: string;
  /** Short slug for `?chain=` links */
  slug: string;
  name: string;
  city: string;
  logoSrc: string;
  bookPath: string;
  accentClassName?: string;
};

/** Bookable hospital chains shown on the visitor booking entry. */
export const PARTNER_HOSPITALS: PartnerHospital[] = [
  {
    chainId: OVUM_CHAIN_ID,
    slug: 'ovum',
    name: OVUM_CHAIN_DISPLAY_NAME,
    city: 'Bengaluru',
    logoSrc: '/images/ovum-hospital-logo.png',
    bookPath: OVUM_BOOK_PATH,
  },
  {
    chainId: KAUVERY_CHAIN_ID,
    slug: 'kauvery',
    name: KAUVERY_CHAIN_DISPLAY_NAME,
    city: 'Bengaluru',
    logoSrc: '/images/kauvery-hospital-logo.png',
    bookPath: KAUVERY_BOOK_PATH,
    accentClassName: 'bg-[#9E1B65] text-white hover:bg-[#9E1B65]/90',
  },
];

export function partnerHospitalByChainId(chainId: string): PartnerHospital | undefined {
  return PARTNER_HOSPITALS.find((h) => h.chainId === chainId);
}

export function partnerHospitalBySlug(slug: string): PartnerHospital | undefined {
  const key = slug.trim().toLowerCase();
  return PARTNER_HOSPITALS.find((h) => h.slug === key || h.chainId === key);
}

/** Display name when the chain is not in the partner catalog. */
export function fallbackChainDisplayName(branchNames: string[]): string {
  const first = branchNames[0] ?? 'Hospital';
  const parts = first.split('—');
  return (parts.length > 1 ? parts[0] : first).trim() || 'Hospital';
}
