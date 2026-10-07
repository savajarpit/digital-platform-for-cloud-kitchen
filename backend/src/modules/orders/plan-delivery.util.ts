/** A subscription's daily delivery, described for the customer and kitchen —
 * it was paid for as part of the plan, so it has no price or invoice of
 * its own. */
export interface PlanDelivery {
  subscriptionId: string;
  planName: string;
  /** "Day 3" (relative plans) or "Week 1 · Mon" (weekly plans). */
  dayLabel: string;
  /** The customer's own note for that day, if they left one. */
  customerNote: string | null;
}

// The label the materializer writes into Order.notes:
// "Subscription: {plan} — {Day N | Week N · Ddd}[ — Note: {note}]".
const PLAN_NOTES =
  /^Subscription: (.+) — (Day \d+|Week \d+ · \w{3})(?: — Note: ([\s\S]*))?$/;

export function planDeliveryOf(order: {
  subscriptionId: string | null;
  notes: string | null;
}): PlanDelivery | null {
  if (!order.subscriptionId) return null;
  const match = PLAN_NOTES.exec(order.notes ?? '');
  return {
    subscriptionId: order.subscriptionId,
    planName: match?.[1] ?? 'Meal plan',
    dayLabel: match?.[2] ?? '',
    customerNote: match?.[3]?.trim() || null,
  };
}
