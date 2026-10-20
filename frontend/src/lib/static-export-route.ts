/** Placeholder segment used by `generateStaticParams` for static export. */
export const STATIC_EXPORT_PLACEHOLDER = '_';

function firstParam(value: string | string[] | undefined | null): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/**
 * Read the dynamic segment after `prefix` from a browser pathname.
 * Static export only ships `/prefix/_/`; Vercel rewrites real IDs onto that HTML
 * while leaving the original URL in the address bar.
 */
export function dynamicRouteIdFromPath(
  pathname: string,
  prefix: string,
  reserved: readonly string[] = [STATIC_EXPORT_PLACEHOLDER],
): string {
  const path = (pathname.split('?')[0] ?? '').replace(/\/+$/, '') || '/';
  const base = prefix.replace(/\/+$/, '') || '/';
  if (path === base || !path.startsWith(`${base}/`)) return '';
  const segment = decodeURIComponent(path.slice(base.length + 1).split('/')[0] ?? '');
  if (!segment || reserved.includes(segment)) return '';
  return segment;
}

/** Prefer the live URL (rewrite) over the baked static param (`_`). */
export function resolveStaticExportParam(
  pathname: string,
  prefix: string,
  param: string | string[] | undefined | null,
  reserved: readonly string[] = [STATIC_EXPORT_PLACEHOLDER],
): string {
  return (
    dynamicRouteIdFromPath(pathname, prefix, reserved) ||
    (!reserved.includes(firstParam(param)) ? firstParam(param) : '')
  );
}

export function vendorDeliveryIdFromLocation(
  pathname: string,
  param?: string | string[] | null,
): string {
  return resolveStaticExportParam(pathname, '/vendor/deliveries', param, [
    STATIC_EXPORT_PLACEHOLDER,
    'book',
  ]);
}

export function hospitalDeliveryIdFromLocation(
  pathname: string,
  param?: string | string[] | null,
): string {
  return resolveStaticExportParam(pathname, '/dashboard/delivery', param, [
    STATIC_EXPORT_PLACEHOLDER,
    'vendors',
  ]);
}

export function visitorVisitIdFromLocation(
  pathname: string,
  param?: string | string[] | null,
): string {
  return resolveStaticExportParam(pathname, '/visitor/visits', param, [STATIC_EXPORT_PLACEHOLDER]);
}

export function visitorVisitPath(bookingId: string): string {
  return `/visitor/visits/${encodeURIComponent(bookingId)}/`;
}
