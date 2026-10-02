import { DeliverySlotUsage } from '../../generated/prisma';
import {
  deliverySlotInUseMessage,
  deliverySlotTimesError,
  slotOffersFor,
  subscriptionSlotInUseMessage,
  usagesFor,
} from './delivery-slot-rules';

describe('slotOffersFor / usagesFor', () => {
  it('offers BOTH to either flow and a single-flow slot only to its own', () => {
    expect(slotOffersFor(DeliverySlotUsage.BOTH, 'ORDERS')).toBe(true);
    expect(slotOffersFor(DeliverySlotUsage.BOTH, 'SUBSCRIPTIONS')).toBe(true);
    expect(slotOffersFor(DeliverySlotUsage.ORDERS, 'SUBSCRIPTIONS')).toBe(
      false,
    );
    expect(slotOffersFor(DeliverySlotUsage.SUBSCRIPTIONS, 'ORDERS')).toBe(
      false,
    );
    expect(
      slotOffersFor(DeliverySlotUsage.SUBSCRIPTIONS, 'SUBSCRIPTIONS'),
    ).toBe(true);
  });

  it('builds the matching filter list', () => {
    expect(usagesFor('ORDERS')).toEqual(['BOTH', 'ORDERS']);
    expect(usagesFor('SUBSCRIPTIONS')).toEqual(['BOTH', 'SUBSCRIPTIONS']);
  });
});

describe('subscriptionSlotInUseMessage', () => {
  it('ignores orders — they keep their snapshotted slot', () => {
    expect(
      subscriptionSlotInUseMessage({
        subscriptions: 0,
        dayChanges: 0,
        orders: 5,
      }),
    ).toBeNull();
  });

  it('names the subscribers that would be stranded', () => {
    expect(
      subscriptionSlotInUseMessage({
        subscriptions: 3,
        dayChanges: 1,
        orders: 0,
      }),
    ).toMatch(
      /^This slot is still used by 3 active subscriptions and 1 upcoming day change, so it has to stay available for subscriptions\./,
    );
  });
});

describe('deliverySlotTimesError', () => {
  it('accepts a window that ends after it starts', () => {
    expect(deliverySlotTimesError('12:00', '15:00')).toBeNull();
  });

  it('rejects an end before or equal to the start', () => {
    expect(deliverySlotTimesError('15:00', '12:00')).toMatch(/must end after/);
    expect(deliverySlotTimesError('12:00', '12:00')).toMatch(/must end after/);
  });
});

describe('deliverySlotInUseMessage', () => {
  it('is null when nothing uses the slot', () => {
    expect(
      deliverySlotInUseMessage({ subscriptions: 0, dayChanges: 0, orders: 0 }),
    ).toBeNull();
  });

  it('lists what still uses it, with singular/plural', () => {
    expect(
      deliverySlotInUseMessage({ subscriptions: 1, dayChanges: 0, orders: 0 }),
    ).toBe(
      'This slot is still used by 1 active subscription. Switch it off instead — customers stop seeing it, and existing deliveries keep their time.',
    );
    expect(
      deliverySlotInUseMessage({ subscriptions: 2, dayChanges: 1, orders: 3 }),
    ).toMatch(
      /^This slot is still used by 2 active subscriptions, 1 upcoming day change and 3 upcoming orders\./,
    );
  });
});
