/** Application timezone — all user-facing dates use IST (Asia/Kolkata). */

export const IST_TIMEZONE = 'Asia/Kolkata';

export function formatIstDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Convert `<input type="datetime-local">` value to IST ISO for the API. */
export function datetimeLocalToIstIso(value: string): string {
  if (!value) return value;
  if (value.includes('+') || value.endsWith('Z')) return value;
  const normalized = value.length === 16 ? `${value}:00` : value;
  return `${normalized}+05:30`;
}

/** Today's calendar date in IST (`YYYY-MM-DD`). */
export function todayIstDateIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIMEZONE }).format(
    new Date(),
  );
}

/** Parse a stored datetime as IST wall-clock parts for date comparisons. */
export function istDateParts(value: string | Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function startOfIstDay(value: string | Date): Date {
  const { year, month, day } = istDateParts(value);
  return new Date(year, month - 1, day);
}
