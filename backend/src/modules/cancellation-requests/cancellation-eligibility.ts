/**
 * Why a customer can't ask to cancel a one-time order right now, or null
 * when they can. Swiggy/Zomato's rule: only until the kitchen starts —
 * here that's while the order is CONFIRMED (paid, not yet PREPARING).
 * Both gates must be on: SUPER_ADMIN's Feature and the tenant's own switch.
 */
export function orderCancelBlockReason(
  order: {
    status: string;
    paymentStatus: string;
    subscriptionId: string | null;
    fulfillmentType: string;
  },
  gates: { featureEnabled: boolean; tenantEnabled: boolean },
): string | null {
  if (!gates.featureEnabled || !gates.tenantEnabled) {
    return 'Cancellation requests aren’t available for orders here — please contact the kitchen.';
  }
  if (order.subscriptionId) {
    return 'This delivery is part of a subscription — manage it from My Subscriptions.';
  }
  if (
    order.fulfillmentType === 'DINE_IN' ||
    order.fulfillmentType === 'TAKEAWAY'
  ) {
    return 'In-store orders can’t be cancelled online — please speak to the staff.';
  }
  if (order.status === 'CANCELLED') {
    return 'This order is already cancelled.';
  }
  if (order.paymentStatus !== 'PAID' || order.status === 'PENDING_PAYMENT') {
    return 'This order hasn’t been paid, so there’s nothing to cancel.';
  }
  if (order.status !== 'CONFIRMED') {
    return 'The kitchen has already started on this order, so it can’t be cancelled now — please contact them.';
  }
  return null;
}

/** Same idea for a subscription: only an ACTIVE one can be asked about. */
export function subscriptionCancelBlockReason(subscription: {
  status: string;
}): string | null {
  if (subscription.status === 'CANCELLED') {
    return 'This subscription is already cancelled.';
  }
  if (subscription.status !== 'ACTIVE') {
    return 'Only an active subscription can be cancelled.';
  }
  return null;
}
