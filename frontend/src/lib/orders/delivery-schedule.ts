import type {
  DeliverySlot,
  DeliverySlotsConfig,
} from "@/lib/api/delivery-slots";
import { hhmmToMinutes } from "@/lib/format/time";

/** Slots still orderable on `date`: on the tenant's today, only those that
 * haven't started yet (the API rejects the rest) — same rule as checkout. */
export function openSlotsFor(
  date: string,
  slots: DeliverySlot[],
  todayStr: string,
  nowMinutes: number,
): DeliverySlot[] {
  if (date !== todayStr) return slots;
  return slots.filter((slot) => hhmmToMinutes(slot.startTime) > nowMinutes);
}

/** First day (in the tenant's own timezone) that's open and still has a
 * slot left — today if possible, otherwise the next open day. */
export function defaultDeliveryDate(config: DeliverySlotsConfig): string {
  const firstUsable = config.days.find(
    (day) =>
      day.open &&
      openSlotsFor(day.date, config.slots, config.todayStr, config.nowMinutes)
        .length > 0,
  );
  return firstUsable?.date ?? config.todayStr;
}

/** Why a date can't take orders (holiday/weekly off), or null when open. */
export function closedReasonFor(
  config: DeliverySlotsConfig,
  date: string,
): string | null {
  const day = config.days.find((d) => d.date === date);
  if (!day || day.open) return null;
  return day.reason ?? "The kitchen is closed on this day";
}
