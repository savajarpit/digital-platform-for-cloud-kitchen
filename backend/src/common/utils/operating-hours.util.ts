export interface DayHoursInput {
  open?: string;
  close?: string;
}

const DAY_ORDER: { key: string; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Why a weekly operating-hours map can't be saved, or null when it can.
 * A day is either closed (no open and no close) or open with a close time
 * later the same day — overnight hours (22:00–02:00) aren't supported by
 * the order-window check, which would treat such a day as closed all day.
 * At least one day must be open: an all-closed week reads as "not set up"
 * elsewhere (orders allowed every day), and "Temporarily closed" is the
 * switch for stopping orders altogether.
 */
export function operatingHoursError(
  hours: Record<string, DayHoursInput | undefined>,
): string | null {
  let openDays = 0;
  for (const { key, label } of DAY_ORDER) {
    const day = hours[key];
    const open = day?.open;
    const close = day?.close;
    if (!open && !close) continue;
    if (!open || !close) {
      return `${label}: set both an opening and a closing time, or mark the day closed.`;
    }
    if (toMinutes(close) <= toMinutes(open)) {
      return `${label}: closing time must be later than opening time (hours can't run past midnight).`;
    }
    openDays += 1;
  }
  if (openDays === 0) {
    return 'Keep at least one day open — use "Temporarily closed" to stop taking orders.';
  }
  return null;
}
