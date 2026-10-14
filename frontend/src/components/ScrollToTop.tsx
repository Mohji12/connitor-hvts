'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

/** Opens every page at the top, including after a reload. Links to an in-page #anchor are left alone. */
export function ScrollToTop(): null {
  const pathname = usePathname();

  React.useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  React.useEffect(() => {
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
