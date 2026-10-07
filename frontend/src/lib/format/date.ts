/** "9 Oct 2026" — one unambiguous date format everywhere. A bare
 * toLocaleDateString() follows the viewer's browser locale, so the same date
 * showed as "10/9/2026" (en-US) to one person and "9/10/2026" to another. */
/** "3 Oct" for a tenant-local YYYY-MM-DD string, read in UTC so it never
 * shifts a day in the viewer's own timezone. */
export function formatDateStrShort(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** `dateStr` (YYYY-MM-DD) moved by `days` calendar days. */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "3 Oct 2026, 5:32 pm" — same fixed format as formatDate, with the time. */
export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
