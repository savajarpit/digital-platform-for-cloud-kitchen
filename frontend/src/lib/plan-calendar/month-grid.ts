/** Pure date helpers for the plan calendar. Dates are always YYYY-MM-DD
 * strings (tenant-local, as the API sends them) — never round-tripped through
 * a local-timezone Date, which would shift a day in some timezones. */

export interface GridCell {
  date: string;
  /** False for the leading/trailing days that belong to a neighbouring month. */
  inMonth: boolean;
}

function toUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "2026-09-22" -> "2026-09" */
export function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** Moves a "YYYY-MM" key by `delta` months. */
export function addMonths(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const moved = new Date(Date.UTC(y, m - 1 + delta, 1));
  return fromUtc(moved).slice(0, 7);
}

/** Monday-first weeks covering the whole month, padded with neighbouring-month days. */
export function buildMonthGrid(monthKey: string): GridCell[][] {
  const first = toUtc(`${monthKey}-01`);
  // getUTCDay: 0=Sun..6=Sat -> Monday-first offset 0..6
  const leading = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - leading);

  const weeks: GridCell[][] = [];
  const cursor = new Date(start);
  do {
    const week: GridCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = fromUtc(cursor);
      week.push({ date, inMonth: monthOf(date) === monthKey });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  } while (monthOf(fromUtc(cursor)) === monthKey);
  return weeks;
}

export interface MonthPage {
  /** "YYYY-MM" */
  month: string;
  weeks: GridCell[][];
}

/** One page per month from `startDate`'s month to `endDate`'s. Only the
 * weeks that end before `startDate` are dropped — every week from the start
 * onward stays, so the customer sees the whole rest of the month (and the
 * dates around their plan) rather than just the plan's own rows. `inMonth`
 * here means "inside [startDate, endDate]": a plan day of the neighbouring
 * month in a shared row is live, everything outside the span is faded. */
export function buildMonthPages(
  startDate: string,
  endDate: string,
): MonthPage[] {
  const inRange = (date: string) => date >= startDate && date <= endDate;
  const pages: MonthPage[] = [];
  for (
    let month = monthOf(startDate);
    month <= monthOf(endDate);
    month = addMonths(month, 1)
  ) {
    const weeks = buildMonthGrid(month)
      .filter((week) => week[6].date >= startDate)
      .map((week) =>
        week.map((c) => ({ date: c.date, inMonth: inRange(c.date) })),
      );
    pages.push({ month, weeks });
  }
  return pages;
}

/** Index of `date`'s own month page (falling back to any page whose rows
 * show it), or 0. */
export function monthPageIndexOf(
  pages: MonthPage[],
  date: string | null,
): number {
  if (!date) return 0;
  const own = pages.findIndex((p) => p.month === monthOf(date));
  if (own !== -1) return own;
  return Math.max(
    pages.findIndex((p) => p.weeks.some((w) => w.some((c) => c.date === date))),
    0,
  );
}

/** "Oct" */
export function formatMonthShort(dateStr: string): string {
  return toUtc(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    timeZone: "UTC",
  });
}

export function dayOfMonth(dateStr: string): number {
  return Number(dateStr.slice(8, 10));
}

export function formatMonthTitle(monthKey: string): string {
  return toUtc(`${monthKey}-01`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatLongDate(dateStr: string): string {
  return toUtc(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function formatWeekday(dateStr: string): string {
  return toUtc(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    timeZone: "UTC",
  });
}
