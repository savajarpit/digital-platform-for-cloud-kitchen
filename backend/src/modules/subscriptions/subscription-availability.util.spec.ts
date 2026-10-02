import { newSubscriptionsClosedReason } from './subscription-availability.util';

const accepting = { isAcceptingNewSubscriptions: true, closureReason: null };
const open = { isTemporarilyClosed: false, closureReason: null };

describe('newSubscriptionsClosedReason', () => {
  it('allows sign-ups when both switches are open or unset', () => {
    expect(newSubscriptionsClosedReason(accepting, open)).toBeNull();
    expect(newSubscriptionsClosedReason(null, null)).toBeNull();
  });

  it('uses the subscription pause reason, or a default', () => {
    expect(
      newSubscriptionsClosedReason(
        {
          isAcceptingNewSubscriptions: false,
          closureReason: ' Full for October ',
        },
        open,
      ),
    ).toBe('Full for October');
    expect(
      newSubscriptionsClosedReason(
        { isAcceptingNewSubscriptions: false, closureReason: null },
        open,
      ),
    ).toBe('This business is not accepting new subscriptions right now.');
  });

  it('blocks sign-ups while the store is temporarily closed', () => {
    expect(
      newSubscriptionsClosedReason(accepting, {
        isTemporarilyClosed: true,
        closureReason: 'Renovation',
      }),
    ).toBe(
      "We're not taking new orders or subscriptions right now — Renovation.",
    );
    expect(
      newSubscriptionsClosedReason(null, {
        isTemporarilyClosed: true,
        closureReason: '  ',
      }),
    ).toBe(
      "We're not taking new orders or subscriptions right now — Temporarily closed.",
    );
  });

  it('prefers the subscription pause message when both are off', () => {
    expect(
      newSubscriptionsClosedReason(
        { isAcceptingNewSubscriptions: false, closureReason: 'Plans full' },
        { isTemporarilyClosed: true, closureReason: 'Renovation' },
      ),
    ).toBe('Plans full');
  });
});
