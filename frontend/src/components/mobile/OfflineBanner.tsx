'use client';

import * as React from 'react';
import { WifiOff } from 'lucide-react';
import { useIsAppShell } from '@/hooks/use-mobile';
import { getNetworkOnline, subscribeNetworkStatus } from '@/lib/mobile/network';

/**
 * Visible in the app shell when the device has no network.
 * Does not authorize scans. A cached QR image is display-only.
 */
export function OfflineBanner(): React.ReactElement | null {
  const appShell = useIsAppShell();
  const [online, setOnline] = React.useState(getNetworkOnline);

  React.useEffect(() => {
    setOnline(getNetworkOnline());
    return subscribeNetworkStatus(setOnline);
  }, []);

  if (!appShell || online) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] border-b border-amber-300 bg-amber-50 px-3 py-2 text-center text-[13px] leading-snug text-amber-950"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <span className="inline-flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        You are offline. Bookings and gate checks need a connection. A saved QR image is not proof of
        entry.
      </span>
    </div>
  );
}
