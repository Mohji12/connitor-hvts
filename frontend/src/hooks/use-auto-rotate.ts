'use client';

import { useCallback, useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

type UseAutoRotateOptions = {
  count: number;
  intervalMs: number;
  paused?: boolean;
};

type UseAutoRotateResult = {
  index: number;
  select: (next: number) => void;
  running: boolean;
  cycleKey: string;
};

export function useAutoRotate({ count, intervalMs, paused = false }: UseAutoRotateOptions): UseAutoRotateResult {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onVisibility = (): void => setHidden(document.visibilityState === 'hidden');
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const running = !paused && !hidden && !reducedMotion && count > 1;

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => window.clearTimeout(timer);
  }, [running, index, nonce, count, intervalMs]);

  const select = useCallback((next: number): void => {
    setIndex(next);
    setNonce((n) => n + 1);
  }, []);

  return { index, select, running, cycleKey: `${index}-${nonce}` };
}
