export class DateUtil {
  static addSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() + seconds * 1000);
  }

  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  static addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  static isExpired(date: Date): boolean {
    return new Date() > date;
  }

  static now(): Date {
    return new Date();
  }

  /** "Now" broken into a tenant-timezone calendar date + minutes-since-midnight. */
  static getTenantNow(timezone: string): {
    dateStr: string;
    minutesSinceMidnight: number;
  } {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const map: Record<string, string> = {};
    for (const part of parts) map[part.type] = part.value;

    return {
      dateStr: `${map.year}-${map.month}-${map.day}`,
      minutesSinceMidnight:
        parseInt(map.hour, 10) * 60 + parseInt(map.minute, 10),
    };
  }

  /** Adds `days` to a `YYYY-MM-DD` string, returning the same format. */
  static addDaysToDateStr(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  /** "HH:mm" → minutes since midnight. */
  static hhmmToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  /** Any `Date` formatted as a `YYYY-MM-DD` calendar date in the given timezone — for bucketing historical rows (e.g. revenue-by-day), not just "now". */
  static toTenantDateStr(date: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const map: Record<string, string> = {};
    for (const part of parts) map[part.type] = part.value;
    return `${map.year}-${map.month}-${map.day}`;
  }

  /** Day of week in the tenant's timezone, 0=Sun..6=Sat (matches Date#getDay()). */
  static getTenantDayOfWeek(timezone: string): number {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    }).format(new Date());
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.indexOf(weekday);
  }
}
