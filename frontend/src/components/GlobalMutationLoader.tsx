'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import {
  getMutationBusyCount,
  subscribeMutationBusy,
} from '@/lib/mutation-busy';

/** Delay before showing so fast requests do not flash the overlay. */
const SHOW_DELAY_MS = 200;

/**
 * Full-screen Connitor loader while form/API mutations are in flight.
 * Driven by axios interceptors on POST/PUT/PATCH/DELETE.
 */
export function GlobalMutationLoader(): React.ReactElement | null {
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBusy(getMutationBusyCount() > 0);
    return subscribeMutationBusy(() => {
      setBusy(getMutationBusyCount() > 0);
    });
  }, []);

  useEffect(() => {
    if (!busy) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [busy]);

  if (!mounted || !visible) {
    return null;
  }

  return createPortal(
    <ConnitorLoader variant="fullscreen" message="Submitting… please wait" />,
    document.body,
  );
}
