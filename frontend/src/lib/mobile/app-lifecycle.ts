type AppStateListener = () => void;

type CapacitorApp = {
  addListener: (
    event: 'appStateChange',
    cb: (state: { isActive: boolean }) => void,
  ) => Promise<{ remove: () => Promise<void> }>;
};

async function loadCapacitorApp(): Promise<CapacitorApp | null> {
  if (typeof window === 'undefined' || !(window as Window & { Capacitor?: unknown }).Capacitor) {
    return null;
  }
  try {
    const mod = await import('@capacitor/app');
    return mod.App as CapacitorApp;
  } catch {
    return null;
  }
}

/** Fires when the native app or tab becomes visible again. */
export function subscribeAppResume(listener: AppStateListener): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => undefined;
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      listener();
    }
  };
  document.addEventListener('visibilitychange', onVisible);

  let removeNative: (() => void) | undefined;
  void loadCapacitorApp().then(async (app) => {
    if (!app) return;
    try {
      const handle = await app.addListener('appStateChange', (state) => {
        if (state.isActive) listener();
      });
      removeNative = () => {
        void handle.remove();
      };
    } catch {
      // visibilitychange remains the fallback.
    }
  });

  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    removeNative?.();
  };
}
