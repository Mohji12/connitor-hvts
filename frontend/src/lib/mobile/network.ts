/**
 * Connectivity for the app shell.
 * Offline does not authorize a scan. A cached QR image is display-only.
 */

export type NetworkStatusListener = (online: boolean) => void;

type CapacitorNetwork = {
  getStatus: () => Promise<{ connected: boolean }>;
  addListener: (
    event: 'networkStatusChange',
    cb: (status: { connected: boolean }) => void,
  ) => Promise<{ remove: () => Promise<void> }>;
};

function browserOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

async function loadCapacitorNetwork(): Promise<CapacitorNetwork | null> {
  if (typeof window === 'undefined' || !(window as Window & { Capacitor?: unknown }).Capacitor) {
    return null;
  }
  try {
    const mod = await import('@capacitor/network');
    return mod.Network as CapacitorNetwork;
  } catch {
    return null;
  }
}

export function getNetworkOnline(): boolean {
  return browserOnline();
}

/** Subscribe to connectivity. Capacitor Network is used when the native bridge is present. */
export function subscribeNetworkStatus(listener: NetworkStatusListener): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  listener(browserOnline());

  const onOnline = () => listener(true);
  const onOffline = () => listener(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  let removeNative: (() => void) | undefined;
  void loadCapacitorNetwork().then(async (network) => {
    if (!network) return;
    try {
      const status = await network.getStatus();
      listener(status.connected);
      const handle = await network.addListener('networkStatusChange', (next) => {
        listener(next.connected);
      });
      removeNative = () => {
        void handle.remove();
      };
    } catch {
      // Browser events remain the fallback.
    }
  });

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    removeNative?.();
  };
}
