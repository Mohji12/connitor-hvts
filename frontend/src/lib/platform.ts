type CapacitorGlobal = { isNativePlatform?: () => boolean };

type ConninterWindow = Window & {
  Capacitor?: CapacitorGlobal;
  /** Set by Expo / future native WebView shells before page scripts run. */
  __CONNINTER_NATIVE_SHELL__?: string;
};

/** True when the page runs inside the Conninter Android/iOS shell (Capacitor or Expo WebView). */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const win = window as ConninterWindow;
  if (win.__CONNINTER_NATIVE_SHELL__) {
    return true;
  }
  const cap = win.Capacitor;
  if (cap?.isNativePlatform) {
    return cap.isNativePlatform();
  }
  return Boolean(cap);
}
