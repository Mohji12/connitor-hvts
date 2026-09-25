import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

const backendProxyTarget = (
  process.env.BACKEND_PROXY_URL ??
  process.env.NEXT_PUBLIC_BACKEND_API_URL ??
  'http://127.0.0.1:8002'
).replace(/\/$/, '');

const isProdBuild = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Static export (Vercel / local) — HTML in `out/` then `scripts/prepare-dist.mjs` → `dist/`
  ...(isProdBuild ? { output: 'export' as const } : {}),
  // Windows builds often OOM/crash with many parallel static-generation workers
  ...(isProdBuild ? { experimental: { cpus: 1 } } : {}),
  // Dev: proxy /api/* to Python (or Nest) backend so the browser uses same origin (port 3000)
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: `${backendProxyTarget}/api/:path*`,
      },
    ];
  },
  trailingSlash: true,
  outputFileTracingRoot: frontendRoot,
  turbopack: {
    root: frontendRoot,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
