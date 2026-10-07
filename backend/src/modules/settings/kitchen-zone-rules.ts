import { countPhrase, joinPhrases } from '../../common/utils/count-phrase.util';

/** Widest delivery radius a zone can have, in meters (50 km). */
export const MAX_ZONE_RADIUS_METERS = 50_000;
/** Smallest useful radius, in meters — a 0 m zone serves no address. */
export const MIN_ZONE_RADIUS_METERS = 100;
/** Cap for a delivery fee, minimum order or free-delivery threshold, in
 * paise (₹10,000) — anything above is a typo, not a price. */
export const MAX_DELIVERY_AMOUNT_PAISE = 1_000_000;

export interface KitchenZoneUsage {
  tables: number;
  waitlist: number;
  orders: number;
}

/** Why a kitchen zone can't be deleted, or null when nothing references
 * it. Switching it off is always possible instead. */
export function kitchenZoneInUseMessage(
  usage: KitchenZoneUsage,
): string | null {
  const users = joinPhrases([
    countPhrase(usage.tables, 'dining table'),
    countPhrase(usage.waitlist, 'waitlist entry', 'waitlist entries'),
    countPhrase(usage.orders, 'pickup or dine-in order'),
  ]);
  if (!users) return null;
  return `This outlet still has ${users}. Switch it off instead — it stops serving new addresses, and its history stays intact.`;
}
