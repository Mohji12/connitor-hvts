'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { APP_HOME_PATH } from '@/lib/app-back';
import {
  isMarketingHomePath,
  rewriteMarketingHomeUrl,
} from '@/lib/native-home-guard';
import { isNativeApp } from '@/lib/platform';

/**
 * Hard block: in Capacitor / Expo WebView, never stay on (or navigate to)
 * the marketing homepage — always send the user to Welcome `/app/`.
 */
export function NativeMarketingHomeBlock(): null {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;

    if (isMarketingHomePath(pathname)) {
      router.replace(APP_HOME_PATH);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!isNativeApp()) return;

    const blockClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;

      const rewritten = rewriteMarketingHomeUrl(href);
      if (!rewritten) return;

      event.preventDefault();
      event.stopPropagation();
      router.replace(APP_HOME_PATH);
    };

    const blockPopState = () => {
      if (isMarketingHomePath(window.location.pathname)) {
        router.replace(APP_HOME_PATH);
      }
    };

    document.addEventListener('click', blockClick, true);
    window.addEventListener('popstate', blockPopState);
    return () => {
      document.removeEventListener('click', blockClick, true);
      window.removeEventListener('popstate', blockPopState);
    };
  }, [router]);

  return null;
}
