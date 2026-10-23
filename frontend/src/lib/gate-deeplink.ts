/**
 * Deep-link helpers so a scanned hospital gate QR opens inside the Conninter app
 * (Android `intent://`, iOS custom scheme) instead of the Chrome browser.
 *
 * The QR payload always carries a browser fallback URL, so a visitor without the
 * app installed still lands on the web gate picker.
 */

import { isNativeApp } from '@/lib/platform';

/** Android package / iOS bundle ID. */
export const CONNINTER_APP_ID = 'com.conninter.hvts';
/** Custom URL scheme registered in mobile app (`conninter://`). */
export const CONNINTER_APP_SCHEME = 'conninter';

const PROMPT_KEY_PREFIX = 'conninter.gate.appPrompt.';

/** Web path for a branch gate picker. */
export function gateWebPath(branchId: string): string {
  return `/gate/${encodeURIComponent(branchId)}/`;
}

export function gateWebUrl(branchId: string, origin: string): string {
  return `${origin.replace(/\/+$/, '')}${gateWebPath(branchId)}`;
}

/**
 * Android intent URL: opens the app when installed, otherwise the fallback URL.
 * `fallbackUrl` should be an absolute `https://` link to the gate picker.
 */
export function androidGateIntent(branchId: string, fallbackUrl: string): string {
  return [
    `intent://gate/${encodeURIComponent(branchId)}#Intent`,
    `scheme=${CONNINTER_APP_SCHEME}`,
    `package=${CONNINTER_APP_ID}`,
    `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}`,
    `S.market_referrer=${encodeURIComponent('utm_source=qr&utm_medium=gate')}`,
    'end',
  ].join(';');
}

/** iOS custom-scheme URL for the same destination. */
export function iosGateDeepLink(branchId: string): string {
  return `${CONNINTER_APP_SCHEME}://gate/${encodeURIComponent(branchId)}`;
}

/**
 * Deep link that works on both platforms.
 * iOS ignores `intent://`, so a plain custom-scheme link is used there and the
 * `browser_fallback_url` is only meaningful for Android.
 */
export function gateDeepLink(branchId: string, fallbackUrl: string, userAgent?: string): string {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (/iPhone|iPad|iPod/i.test(ua || '')) {
    return iosGateDeepLink(branchId);
  }
  return androidGateIntent(branchId, fallbackUrl);
}

export function parseGateBranchId(raw: string): string {
  const text = (raw || '').trim();
  if (!text) return '';
  // conninter://gate/<branchId> (Expo custom scheme)
  const custom = text.match(/(?:conninter|com\.conninter\.hvts(?:\.expo)?):\/\/gate\/([^/?#]+)/i);
  if (custom?.[1]) return decodeURIComponent(custom[1]);
  // intent://gate/<branchId>#Intent;... (Android intent URL)
  const intent = text.match(/intent:\/\/gate\/([^#;/?]+)/i);
  if (intent?.[1]) return decodeURIComponent(intent[1]);
  // https://www.conninter.com/gate/<branchId>/
  const https = text.match(/\/gate\/([^/?#]+)/i);
  if (https?.[1]) return decodeURIComponent(https[1]);
  return '';
}

function isMobileBrowser(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod/i.test(userAgent);
}

/** True when the web gate page should try to hand off to the native app. */
export function shouldTryOpenNativeGate(userAgent: string, search = ''): boolean {
  if (typeof window !== 'undefined' && isNativeApp()) {
    return false;
  }
  if (!isMobileBrowser(userAgent)) {
    return false;
  }
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (params.get('stay') === '1' || params.get('native') === '1') {
    return false;
  }
  return true;
}

export function markGateAppPrompted(branchId: string): boolean {
  if (typeof sessionStorage === 'undefined') return true;
  const key = `${PROMPT_KEY_PREFIX}${branchId}`;
  try {
    if (sessionStorage.getItem(key) === '1') return false;
    sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

/** Navigate to the native app. No-op when already inside the shell. */
export function tryOpenNativeGateApp(branchId: string, fallbackUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!shouldTryOpenNativeGate(navigator.userAgent || '', window.location.search)) {
    return false;
  }
  if (!markGateAppPrompted(branchId)) {
    return false;
  }
  window.location.href = gateDeepLink(branchId, fallbackUrl);
  return true;
}
