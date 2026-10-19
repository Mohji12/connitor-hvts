/** Product name for a stored role. The account role stays WARD_ADMIN. */
export function displayRole(role: string | null | undefined): string {
  if (!role) return '';
  if (role === 'WARD_ADMIN') return 'Receptionist';
  if (role === 'PRODUCT_ADMIN') return 'Product Admin';
  if (role === 'CHAIN_ADMIN') return 'Hospital Super Admin';
  return role.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
}
