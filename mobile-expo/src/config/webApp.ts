/** Live Conninter website — mobile shell opens these for full product flows. */
export const WEB_APP_ORIGIN = (
  process.env.EXPO_PUBLIC_WEB_URL ?? 'https://www.conninter.com'
).replace(/\/+$/, '');

export const webPaths = {
  visitorLogin: '/visitor/login/',
  visitorRegister: '/visitor/register/',
  visitorPass: '/visitor-pass/',
  /** Prefer when resuming a signed-in visitor session. */
  visitorDashboard: '/visitor/dashboard/',
  deliveryLogin: '/delivery/login/',
  deliveryRegister: '/vendor/register/',
  staffLogin: '/staff/login/',
  staffRegister: '/auth/register/',
  staffPortal: '/portal/',
  securityLogin: '/security/login/',
  attendantApply: (slug: string) =>
    `/attendant-pass/${encodeURIComponent(slug.replace(/^\/+|\/+$/g, ''))}/`,
} as const;

/** Default entry path when there is no saved WebView URL for this persona. */
export const personaDefaultPaths = {
  staff: webPaths.staffLogin,
  visitor: webPaths.visitorPass,
  distributor: webPaths.deliveryLogin,
  attendant: webPaths.visitorPass,
} as const;

export function webUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${WEB_APP_ORIGIN}${normalized}`;
}

/** Turn a full Conninter URL into a path we can store / reopen. */
export function pathFromWebUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const origin = new URL(WEB_APP_ORIGIN);
    if (parsed.origin !== origin.origin) return null;
    return `${parsed.pathname}${parsed.search}` || '/';
  } catch {
    return null;
  }
}
