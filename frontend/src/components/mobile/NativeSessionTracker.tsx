'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isNativeApp } from '@/lib/platform';
import { rememberCurrentInAppLocation } from '@/lib/native-session';

/** Saves the current in-app URL so a killed app can reopen on the same screen. */
export function NativeSessionTracker(): null {
  const pathname = usePathname();

  useEffect(() => {
    if (!isNativeApp()) return;
    rememberCurrentInAppLocation();
  }, [pathname]);

  return null;
}
