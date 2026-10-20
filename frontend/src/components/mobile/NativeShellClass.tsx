'use client';

import { useEffect } from 'react';
import { isNativeApp } from '@/lib/platform';

/** Marks <html> so CSS can force phone layouts inside the Android WebView. */
export function NativeShellClass(): null {
  useEffect(() => {
    const apply = () => {
      document.documentElement.classList.toggle('native-app', isNativeApp());
    };
    apply();
  }, []);
  return null;
}
