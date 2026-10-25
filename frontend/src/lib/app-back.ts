'use client';

import * as React from 'react';

export const APP_HOME_PATH = '/app/';

type Router = { back: () => void; push: (href: string) => void };

/** Exit the native app when the gate page is the entry point (QR scan). */
function tryExitNativeGate(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.location.pathname.startsWith('/gate/')) return false;
  try {
    type CapApp = { Plugins?: { App?: { exitApp?: () => void } } };
    const app = (window as unknown as { Capacitor?: CapApp }).Capacitor?.Plugins?.App;
    if (app?.exitApp) {
      app.exitApp();
      return true;
    }
  } catch {
    // fall through
  }
  return false;
}

/** Go to the previous page, or the app launch screen when there is no history. */
export function goBackInApp(router: Router): void {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back();
    return;
  }
  if (tryExitNativeGate()) return;
  router.push(APP_HOME_PATH);
}

export function isAppHome(pathname: string | null | undefined): boolean {
  const path = (pathname ?? '').replace(/\/+$/, '');
  // Welcome / role chooser only — not the marketing homepage `/`.
  return path === '/app';
}

/** Login / register screens already have their own chrome — no extra native Back bar. */
export function isStandaloneAuthPath(pathname: string | null | undefined): boolean {
  const path = (pathname ?? '').replace(/\/+$/, '') || '/';
  return (
    path.startsWith('/staff/login') ||
    path.startsWith('/delivery/login') ||
    path.startsWith('/security/login') ||
    path.startsWith('/auth') ||
    path.startsWith('/visitor/login') ||
    path.startsWith('/visitor/register') ||
    path.startsWith('/visitor/forgot-password') ||
    path.startsWith('/vendor/register') ||
    path === '/portal'
  );
}

// Pages that render AppTopBar already have a back arrow; the global bar stays hidden there.
let mountedTopBars = 0;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function useRegisterTopBar(): void {
  React.useEffect(() => {
    mountedTopBars += 1;
    emit();
    return () => {
      mountedTopBars -= 1;
      emit();
    };
  }, []);
}

export function useHasTopBar(): boolean {
  return React.useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => mountedTopBars > 0,
    () => false,
  );
}
