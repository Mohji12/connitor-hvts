/** Ovum Woman & Child Speciality Hospital — must match python_backend/app/constants/ovum_entities.py */
export const OVUM_CHAIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';

export const OVUM_CHAIN_DISPLAY_NAME = 'Ovum Hospitals';

export const OVUM_BOOK_PATH = '/book-appointment/ovum/';

export const OVUM_ADMIN_EMAIL_DOMAIN = 'ovum.conninter.com';

/** True when the signed-in user belongs to the Ovum chain (or Ovum staff email). */
export function isOvumHospitalUser(input: {
  hospitalChainId?: string | null;
  email?: string | null;
  hospitalChainName?: string | null;
}): boolean {
  if (input.hospitalChainId === OVUM_CHAIN_ID) return true;
  const email = (input.email ?? '').toLowerCase();
  if (email.endsWith(`@${OVUM_ADMIN_EMAIL_DOMAIN}`)) return true;
  const chainName = (input.hospitalChainName ?? '').toLowerCase();
  return chainName.includes('ovum');
}
