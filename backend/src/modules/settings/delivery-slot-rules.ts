import { DeliverySlotUsage } from '../../generated/prisma';

/** The two flows a slot can be offered in. */
export type SlotFlow = 'ORDERS' | 'SUBSCRIPTIONS';

/** Whether a slot with this usage is offered in `flow` — BOTH is offered in
 * either. Applies even if the subscriptions feature is later revoked: a
 * subscriptions-only slot never leaks into order checkout. */
export function slotOffersFor(
  usage: DeliverySlotUsage,
  flow: SlotFlow,
): boolean {
  return usage === DeliverySlotUsage.BOTH || usage === flow;
}

/** The usage values offered in `flow`, for a `usage: { in: … }` filter. */
export function usagesFor(flow: SlotFlow): DeliverySlotUsage[] {
  return [DeliverySlotUsage.BOTH, DeliverySlotUsage[flow]];
}

export interface DeliverySlotDependents {
  subscriptions: number;
  dayChanges: number;
  orders: number;
}

/** Why a slot's times can't be saved, or null. A slot is a window within
 * one day — it can't end before (or when) it starts. */
export function deliverySlotTimesError(
  startTime: string,
  endTime: string,
): string | null {
  return endTime <= startTime
    ? 'The slot must end after it starts (and within the same day).'
    : null;
}

/** Why a slot can't be deleted, or null when nothing still uses it. The
 * owner can always switch it off instead: customers stop seeing it, while
 * existing subscribers and orders keep their time. */
export function deliverySlotInUseMessage(
  usage: DeliverySlotDependents,
): string | null {
  const parts = [
    plural(usage.subscriptions, 'active subscription'),
    plural(usage.dayChanges, 'upcoming day change'),
    plural(usage.orders, 'upcoming order'),
  ].filter((p): p is string => p !== null);
  if (parts.length === 0) return null;
  return `This slot is still used by ${joinList(parts)}. Switch it off instead — customers stop seeing it, and existing deliveries keep their time.`;
}

/** Why a slot can't stop being offered to subscriptions, or null. Live
 * subscribers (and day changes) on it would be left on a time the
 * subscription flow no longer offers. Orders are unaffected — they keep the
 * slot they snapshotted. */
export function subscriptionSlotInUseMessage(
  dependents: DeliverySlotDependents,
): string | null {
  const parts = [
    plural(dependents.subscriptions, 'active subscription'),
    plural(dependents.dayChanges, 'upcoming day change'),
  ].filter((p): p is string => p !== null);
  if (parts.length === 0) return null;
  return `This slot is still used by ${joinList(parts)}, so it has to stay available for subscriptions. Move them to another slot first, or keep it on "Both".`;
}

function plural(count: number, noun: string): string | null {
  if (count === 0) return null;
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function joinList(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
