import { useEffect } from 'react';

/** Operational dashboards refetch this often so slot extensions and check-ins appear live. */
export const DASHBOARD_REFRESH_MS = 5_000;

export function useDashboardRefresh(callback: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(callback, DASHBOARD_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [callback, enabled]);
}
