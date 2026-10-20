/**
 * Paths that mean the user is still in a signed-in flow and should reopen there.
 * Login / register / welcome must not auto-open (that would look like a forced re-login).
 */
export function isAuthenticatedResumePath(pathWithSearch: string): boolean {
  const path = (pathWithSearch.split('?')[0] ?? '').replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/app') return false;
  if (
    path.startsWith('/staff/login') ||
    path.startsWith('/delivery/login') ||
    path.startsWith('/security/login') ||
    path.startsWith('/auth') ||
    path.startsWith('/visitor/login') ||
    path.startsWith('/visitor/register') ||
    path.startsWith('/visitor/forgot-password') ||
    path.startsWith('/visitor/oauth') ||
    path.startsWith('/vendor/register') ||
    path === '/portal'
  ) {
    return false;
  }
  return (
    path.startsWith('/dashboard') ||
    path.startsWith('/security') ||
    path.startsWith('/vendor') ||
    path.startsWith('/visitor/dashboard') ||
    path.startsWith('/visitor/pass') ||
    path.startsWith('/visitor/wallet') ||
    path.startsWith('/book-appointment') ||
    path.startsWith('/attendant') ||
    path.startsWith('/attendant-pass')
  );
}
