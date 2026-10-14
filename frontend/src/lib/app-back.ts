'use client';

import * as React from 'react';

export const APP_HOME_PATH = '/app/';

type Router = { back: () => void; push: (href: string) => void };

/** Go to the previous page, or the app launch screen when there is no history. */
export function goBackInApp(router: Router): void {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back();
    return;
  }
  router.push(APP_HOME_PATH);
}

export function isAppHome(pathname: string | null | undefined): boolean {
  const path = (pathname ?? '').replace(/\/+$/, '');
  return path === '' || path === '/app';
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
