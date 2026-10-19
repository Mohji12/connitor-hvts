type CapacitorGlobal = { isNativePlatform?: () => boolean };

type ConninterWindow = Window & {
  Capacitor?: CapacitorGlobal;
  /** Set by Expo / future native WebView shells before page scripts run. */
  __CONNINTER_NATIVE_SHELL__?: string;
};

/** Persists across navigations on the live site after Capacitor splash hands off. */
const NATIVE_SHELL_STORAGE_KEY = 'conninterNativeShell';

function markNativeShellFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('native');
    if (flag !== '1' && flag !== 'capacitor' && flag !== 'expo') {
      return;
    }
    localStorage.setItem(NATIVE_SHELL_STORAGE_KEY, '1');
    (window as ConninterWindow).__CONNINTER_NATIVE_SHELL__ = flag;
    params.delete('native');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', next);
  } catch {
    // Ignore storage / history failures in locked-down WebViews.
  }
}

/** True when the page runs inside the Conninter Android/iOS shell (Capacitor or Expo WebView). */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const win = window as ConninterWindow;
  markNativeShellFromUrl();

  if (win.__CONNINTER_NATIVE_SHELL__) {
    return true;
  }
  try {
    if (localStorage.getItem(NATIVE_SHELL_STORAGE_KEY) === '1') {
      return true;
    }
  } catch {
    // ignore
  }
  const cap = win.Capacitor;
  if (cap?.isNativePlatform) {
    return cap.isNativePlatform();
  }
  return Boolean(cap);
}

/** Append `?native=1` so the live site remembers Welcome `/app/` is home. */
export function withNativeShellQuery(url: string): string {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://www.conninter.com');
    parsed.searchParams.set('native', '1');
    return parsed.toString();
  } catch {
    const join = url.includes('?') ? '&' : '?';
    return `${url}${join}native=1`;
  }
}
