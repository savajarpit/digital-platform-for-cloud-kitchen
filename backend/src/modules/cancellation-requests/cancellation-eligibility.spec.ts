import {
  orderCancelBlockReason,
  subscriptionCancelBlockReason,
} from './cancellation-eligibility';

const confirmed = {
  status: 'CONFIRMED',
  paymentStatus: 'PAID',
  subscriptionId: null,
  fulfillmentType: 'DELIVERY',
};
const on = { featureEnabled: true, tenantEnabled: true };

describe('orderCancelBlockReason', () => {
  it('allows a paid order the kitchen has not started', () => {
    expect(orderCancelBlockReason(confirmed, on)).toBeNull();
    expect(
      orderCancelBlockReason({ ...confirmed, fulfillmentType: 'PICKUP' }, on),
    ).toBeNull();
  });

  it('needs both the platform feature and the tenant switch', () => {
    expect(
      orderCancelBlockReason(confirmed, { ...on, featureEnabled: false }),
    ).toContain('aren’t available');
    expect(
      orderCancelBlockReason(confirmed, { ...on, tenantEnabled: false }),
    ).toContain('aren’t available');
  });

  it('blocks once the kitchen has started', () => {
    for (const status of ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
      expect(orderCancelBlockReason({ ...confirmed, status }, on)).toContain(
        'already started',
      );
    }
  });

  it('blocks unpaid, cancelled, subscription and in-store orders', () => {
    expect(
      orderCancelBlockReason(
        { ...confirmed, status: 'PENDING_PAYMENT', paymentStatus: 'PENDING' },
        on,
      ),
    ).toContain('hasn’t been paid');
    expect(
      orderCancelBlockReason({ ...confirmed, status: 'CANCELLED' }, on),
    ).toContain('already cancelled');
    expect(
      orderCancelBlockReason({ ...confirmed, subscriptionId: 's1' }, on),
    ).toContain('subscription');
    expect(
      orderCancelBlockReason({ ...confirmed, fulfillmentType: 'DINE_IN' }, on),
    ).toContain('In-store');
  });
});

describe('subscriptionCancelBlockReason', () => {
  it('allows only an active subscription', () => {
    expect(subscriptionCancelBlockReason({ status: 'ACTIVE' })).toBeNull();
    expect(subscriptionCancelBlockReason({ status: 'EXPIRED' })).toContain(
      'active',
    );
    expect(subscriptionCancelBlockReason({ status: 'CANCELLED' })).toContain(
      'already cancelled',
    );
  });
});
