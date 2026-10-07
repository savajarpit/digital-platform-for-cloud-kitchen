import { DeliverySlotUsage } from '../../generated/prisma';
import { countPhrase, joinPhrases } from '../../common/utils/count-phrase.util';

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
  const users = joinPhrases([
    countPhrase(usage.subscriptions, 'active subscription'),
    countPhrase(usage.dayChanges, 'upcoming day change'),
    countPhrase(usage.orders, 'upcoming order'),
  ]);
  if (!users) return null;
  return `This slot is still used by ${users}. Switch it off instead — customers stop seeing it, and existing deliveries keep their time.`;
}

/** Why a slot can't stop being offered to subscriptions, or null. Live
 * subscribers (and day changes) on it would be left on a time the
 * subscription flow no longer offers. Orders are unaffected — they keep the
 * slot they snapshotted. */
export function subscriptionSlotInUseMessage(
  dependents: DeliverySlotDependents,
): string | null {
  const users = joinPhrases([
    countPhrase(dependents.subscriptions, 'active subscription'),
    countPhrase(dependents.dayChanges, 'upcoming day change'),
  ]);
  if (!users) return null;
  return `This slot is still used by ${users}, so it has to stay available for subscriptions. Move them to another slot first, or keep it on "Both".`;
}
