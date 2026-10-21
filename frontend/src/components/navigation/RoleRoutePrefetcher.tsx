'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sidebarConfig } from '@/lib/sidebar-config';

function prefetchQuietly(
  router: { prefetch: (href: string) => void | Promise<unknown> },
  href: string,
): void {
  try {
    void Promise.resolve(router.prefetch(href)).catch(() => undefined);
  } catch {
    // Prefetch is best-effort — a failed RSC fetch must not overlay the page.
  }
}

/** Prefer trailing slash to match next.config trailingSlash: true. */
function prefetchPath(href: string): string {
  const path = href.split('?')[0] || '/';
  if (path.length > 1 && !path.endsWith('/')) {
    return `${path}/`;
  }
  return path;
}

const PUBLIC_WARM_ROUTES = [
  '/auth/login/',
  '/visitor/login/',
  '/visitor/register/',
  '/visitor/dashboard/',
  '/book-appointment/',
  '/book-appointment/how-it-works/',
];

/**
 * After the shell paints, warm role sidebar routes so the next click does not
 * wait on first-time Turbopack compile / RSC fetch.
 */
export function RoleRoutePrefetcher({ role }: { role: string }) {
  const router = useRouter();

  useEffect(() => {
    const items = sidebarConfig[role as keyof typeof sidebarConfig] ?? [];
    const paths = [...new Set(items.map((item) => prefetchPath(item.href)))];
    let index = 0;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const run = () => {
      if (cancelled || index >= paths.length) return;
      prefetchQuietly(router, paths[index]);
      index += 1;
      timeoutId = setTimeout(run, 100);
    };

    timeoutId = setTimeout(run, 250);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [role, router]);

  return null;
}

/** Warm common public visitor/auth routes from the home shell. */
export function PublicRoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    let index = 0;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const run = () => {
      if (cancelled || index >= PUBLIC_WARM_ROUTES.length) return;
      prefetchQuietly(router, PUBLIC_WARM_ROUTES[index]);
      index += 1;
      timeoutId = setTimeout(run, 120);
    };

    timeoutId = setTimeout(run, 400);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [router]);

  return null;
}
