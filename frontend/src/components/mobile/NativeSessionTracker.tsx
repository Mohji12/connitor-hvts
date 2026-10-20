'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { subscribeAppResume } from '@/lib/mobile/app-lifecycle';
import {
  NATIVE_WELCOME_PATH,
  rememberCurrentInAppLocation,
  shouldReturnToNativeWelcome,
} from '@/lib/native-session';
import { isNativeApp } from '@/lib/platform';

function returnToWelcomeIfSessionGone(): void {
  if (!isNativeApp()) return;
  if (!shouldReturnToNativeWelcome()) return;
  window.location.assign(NATIVE_WELCOME_PATH);
}

/** Saves the current in-app URL so a killed app can reopen on the same screen. */
export function NativeSessionTracker(): null {
  const pathname = usePathname();

  useEffect(() => {
    if (!isNativeApp()) return;
    rememberCurrentInAppLocation();
  }, [pathname]);

  useEffect(() => {
    if (!isNativeApp()) return;

    const onSessionChanged = () => returnToWelcomeIfSessionGone();
    window.addEventListener('conninter-session-changed', onSessionChanged);
    window.addEventListener('auth-session-cleared', onSessionChanged);
    const stopResume = subscribeAppResume(onSessionChanged);

    return () => {
      window.removeEventListener('conninter-session-changed', onSessionChanged);
      window.removeEventListener('auth-session-cleared', onSessionChanged);
      stopResume();
    };
  }, []);

  return null;
}
