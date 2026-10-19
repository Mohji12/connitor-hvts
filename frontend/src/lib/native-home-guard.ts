import { APP_HOME_PATH } from '@/lib/app-back';
import { isNativeApp } from '@/lib/platform';

/** True when the path is the marketing homepage (never allowed in the native shell). */
export function isMarketingHomePath(pathname: string | null | undefined): boolean {
  const path = (pathname ?? '').split('?')[0]?.split('#')[0] ?? '';
  return path === '/' || path === '';
}

/** Home target for links/buttons: Welcome in the app, marketing site in the browser. */
export function appSafeHomeHref(): string {
  if (typeof window !== 'undefined' && isNativeApp()) {
    return APP_HOME_PATH;
  }
  return '/';
}

/**
 * If `url` is the Conninter marketing homepage, return the Welcome URL.
 * Otherwise return null (navigation is fine).
 */
export function rewriteMarketingHomeUrl(url: string): string | null {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://www.conninter.com');
    const host = parsed.hostname.replace(/^www\./, '');
    if (host !== 'conninter.com' && host !== 'localhost' && !host.endsWith('.vercel.app')) {
      // Still rewrite same-origin relative homes when parsed against current origin.
      if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
        if (isMarketingHomePath(parsed.pathname)) {
          return `${parsed.origin}${APP_HOME_PATH}`;
        }
      }
      return null;
    }
    if (isMarketingHomePath(parsed.pathname)) {
      return `${parsed.origin}${APP_HOME_PATH}`;
    }
  } catch {
    if (url === '/' || url === '') return APP_HOME_PATH;
  }
  return null;
}
