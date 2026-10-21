'use client';

import { useEffect, useState } from 'react';
import { HomePage } from '@/components/home/HomePage';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { APP_HOME_PATH } from '@/lib/app-back';
import { isNativeApp } from '@/lib/platform';

/**
 * Marketing homepage for the browser only.
 * Native shells never render this page — they are forced to Welcome `/app/`.
 */
export default function Home() {
  const [showMarketing, setShowMarketing] = useState(false);

  useEffect(() => {
    if (isNativeApp()) {
      window.location.replace(APP_HOME_PATH);
      return;
    }
    setShowMarketing(true);
  }, []);

  // Native shell: keep the loader forever on this route (effect sends them to /app/).
  // Browser: show marketing only after we've confirmed we're not in the shell.
  if (!showMarketing) {
    return <ConnitorLoader variant="fullscreen" message="Opening Conninter…" />;
  }

  return <HomePage />;
}
