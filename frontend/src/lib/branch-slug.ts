/** "Ovum Hospital — HSR Layout" -> "ovum-hospital-hsr-layout" (same rule as the backend's location slugs). */
export function branchSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
