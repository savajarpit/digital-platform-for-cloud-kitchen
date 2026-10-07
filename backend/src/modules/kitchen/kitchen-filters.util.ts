import { OrderFulfillmentType } from '../../generated/prisma';
import type { KitchenOrderRow } from './kitchen.repository';
import type { KitchenCard } from './kitchen-card.util';
import type { KitchenStage } from './kitchen-rules';

/** Slot filter value for "instant" (ASAP) orders, which have no slot. */
export const INSTANT_SLOT = 'INSTANT';

export interface KitchenFilters {
  kind?: 'ORDERS' | 'PLAN';
  slot?: string;
  type?: OrderFulfillmentType;
  hasNotes?: boolean;
  hasAddons?: boolean;
  planId?: string;
  changedOnly?: boolean;
}

const digitsOf = (value: string | null | undefined): string =>
  (value ?? '').replace(/\D/g, '');

/** Matches the search box against everything staff might know an order
 * by — order number, customer name, email, phone, address, items, add-ons,
 * notes and table — even fields the card itself keeps hidden. */
export function matchesKitchenSearch(
  order: KitchenOrderRow,
  rawQuery: string | undefined,
): boolean {
  const query = rawQuery?.trim().toLowerCase();
  if (!query) return true;

  const address = order.address;
  const haystack = [
    order.orderNumber,
    order.user?.firstName,
    order.user?.lastName,
    order.user && `${order.user.firstName} ${order.user.lastName ?? ''}`,
    order.user?.email,
    order.guestName,
    order.guestPhone,
    address?.contactPhone,
    address?.line1,
    address?.line2,
    address?.city,
    address?.pincode,
    order.tableLabelSnapshot,
    order.prepNotes,
    order.notes,
    ...order.items.flatMap((i) => [
      i.nameSnapshot,
      ...i.addons.map((a) => a.nameSnapshot),
    ]),
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
  if (haystack.includes(query)) return true;

  // "98765 43210", "+91-98765…" — compare phone digits only.
  const queryDigits = digitsOf(query);
  if (queryDigits.length < 4 || queryDigits.length < query.length / 2) {
    return false;
  }
  return [order.guestPhone, address?.contactPhone].some((phone) =>
    digitsOf(phone).includes(queryDigits),
  );
}

export function matchesKitchenFilters(
  card: KitchenCard,
  f: KitchenFilters,
): boolean {
  if (f.kind === 'PLAN' && !card.plan) return false;
  if (f.kind === 'ORDERS' && card.plan) return false;
  if (f.slot) {
    const slotMatches =
      f.slot === INSTANT_SLOT ? card.isInstant : card.slotId === f.slot;
    if (!slotMatches) return false;
  }
  if (f.type && card.fulfillmentType !== f.type) return false;
  if (f.hasNotes && !card.hasNotes) return false;
  if (f.hasAddons && !card.hasAddons) return false;
  if (f.planId && card.plan?.planId !== f.planId) return false;
  if (f.changedOnly && !card.dayChanged) return false;
  return true;
}

export type KitchenStageCounts = Record<KitchenStage, number>;

export function countByStage(cards: KitchenCard[]): KitchenStageCounts {
  const counts: KitchenStageCounts = {
    NEW: 0,
    PREPARING: 0,
    READY: 0,
    DONE: 0,
  };
  for (const card of cards) counts[card.stage] += 1;
  return counts;
}

/** Earliest due first (ties: placed first), or simply placed-first. */
export function sortKitchenCards(
  cards: KitchenCard[],
  sort: 'time' | 'placed' = 'time',
): KitchenCard[] {
  return [...cards].sort((a, b) => {
    if (sort === 'time' && a.dueMinutes !== b.dueMinutes) {
      return a.dueMinutes - b.dueMinutes;
    }
    return a.placedAt.localeCompare(b.placedAt);
  });
}
