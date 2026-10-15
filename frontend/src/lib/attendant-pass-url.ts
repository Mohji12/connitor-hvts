export interface AttendantApplyTarget {
  id: string;
  slug?: string | null;
}

/** Path of the public apply page for a branch, e.g. `/attendant-pass/ovum-kalyan-nagar/`. */
export function attendantApplyPath(branch: AttendantApplyTarget): string {
  return branch.slug
    ? `/attendant-pass/${encodeURIComponent(branch.slug)}/`
    : `/attendant-pass/apply/?branchId=${encodeURIComponent(branch.id)}`;
}

/** Build the public apply URL for a hospital branch. */
export function buildAttendantApplyUrl(branch: AttendantApplyTarget, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${attendantApplyPath(branch)}`;
}

/** Link name from a path like `/attendant-pass/ovum-kalyan-nagar/`; null on `/attendant-pass/apply/`. */
export function attendantSlugFromPath(pathname: string): string | null {
  const match = /^\/attendant-pass\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  const slug = decodeURIComponent(match[1]).toLowerCase();
  return slug === 'apply' ? null : slug;
}
