type CapacitorGlobal = { isNativePlatform?: () => boolean };

/** True when the page runs inside the Conninter Android/iOS shell. */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (cap?.isNativePlatform) {
    return cap.isNativePlatform();
  }
  return Boolean(cap);
}
