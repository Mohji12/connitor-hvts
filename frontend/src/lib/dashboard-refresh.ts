import { useEffect } from 'react';

/** Security / AMS / delivery boards — balance freshness vs API load. */
export const DASHBOARD_REFRESH_MS = 15_000;

/** Analytics overview charts (remote DB); avoid hammering the API every few seconds. */
export const ANALYTICS_OVERVIEW_REFRESH_MS = 60_000;

export function useDashboardRefresh(callback: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(callback, DASHBOARD_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [callback, enabled]);
}
