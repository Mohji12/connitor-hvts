/** Build the public apply URL for a hospital branch. */
export function buildAttendantApplyUrl(branchId: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/attendant-pass/apply?branchId=${encodeURIComponent(branchId)}`;
}
