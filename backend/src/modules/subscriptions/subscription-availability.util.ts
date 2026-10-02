export interface NewSubscriptionSwitches {
  /** Subscription settings: "Accepting new subscriptions". */
  isAcceptingNewSubscriptions: boolean;
  closureReason: string | null;
}

export interface StoreClosureSwitch {
  /** Order Hours: "Temporarily closed". */
  isTemporarilyClosed: boolean;
  closureReason: string | null;
}

/**
 * Why a new subscription can't start right now, or null when it can. Two
 * switches stop sign-ups: the subscription-only pause, and the store-wide
 * "Temporarily closed" (which stops everything new, Swiggy/Zomato style).
 * Existing subscriptions keep running either way — pausing deliveries is
 * what subscription-affecting closed dates are for.
 */
export function newSubscriptionsClosedReason(
  subscriptions: NewSubscriptionSwitches | null,
  store: StoreClosureSwitch | null,
): string | null {
  if (subscriptions && !subscriptions.isAcceptingNewSubscriptions) {
    return (
      subscriptions.closureReason?.trim() ||
      'This business is not accepting new subscriptions right now.'
    );
  }
  if (store?.isTemporarilyClosed) {
    const reason = store.closureReason?.trim() || 'Temporarily closed';
    return `We're not taking new orders or subscriptions right now — ${reason}.`;
  }
  return null;
}
