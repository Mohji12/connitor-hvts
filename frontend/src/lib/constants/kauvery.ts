/** Kauvery Hospital Bengaluru — must match python_backend/app/constants/kauvery_entities.py */
export const KAUVERY_CHAIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa0b';

export const KAUVERY_CHAIN_DISPLAY_NAME = 'Kauvery Hospital';

export const KAUVERY_BOOK_PATH = '/book-appointment/?chain=kauvery';

export const KAUVERY_ADMIN_EMAIL_DOMAIN = 'kauvery.conninter.com';

/** True when the signed-in user belongs to the Kauvery chain (or Kauvery staff email). */
export function isKauveryHospitalUser(input: {
  hospitalChainId?: string | null;
  email?: string | null;
  hospitalChainName?: string | null;
}): boolean {
  if (input.hospitalChainId === KAUVERY_CHAIN_ID) return true;
  const email = (input.email ?? '').toLowerCase();
  if (email.endsWith(`@${KAUVERY_ADMIN_EMAIL_DOMAIN}`)) return true;
  const chainName = (input.hospitalChainName ?? '').toLowerCase();
  return chainName.includes('kauvery');
}
