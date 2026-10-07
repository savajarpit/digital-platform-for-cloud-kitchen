import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  OrderFulfillmentType,
  OrderStatus,
  PaymentMethod,
} from '../../generated/prisma';
import {
  KITCHEN_CANCEL_REQUESTED_MESSAGE,
  assertKitchenMove,
  kitchenDateStrOf,
  kitchenStageOf,
} from './kitchen-rules';

const order = (
  status: OrderStatus,
  extra: Partial<{
    fulfillmentType: OrderFulfillmentType;
    paymentMethod: PaymentMethod;
    cancelRequested: boolean;
  }> = {},
) => ({
  status,
  fulfillmentType: OrderFulfillmentType.DELIVERY,
  paymentMethod: PaymentMethod.RAZORPAY,
  cancelRequested: false,
  ...extra,
});

describe('kitchenStageOf', () => {
  it('maps statuses to kitchen columns', () => {
    expect(kitchenStageOf(order(OrderStatus.CONFIRMED))).toBe('NEW');
    expect(kitchenStageOf(order(OrderStatus.PREPARING))).toBe('PREPARING');
    expect(kitchenStageOf(order(OrderStatus.READY))).toBe('READY');
    expect(kitchenStageOf(order(OrderStatus.OUT_FOR_DELIVERY))).toBe('DONE');
    expect(kitchenStageOf(order(OrderStatus.DELIVERED))).toBe('DONE');
    expect(kitchenStageOf(order(OrderStatus.CANCELLED))).toBeNull();
  });

  it('keeps an unpaid online order out of the kitchen', () => {
    expect(kitchenStageOf(order(OrderStatus.PENDING_PAYMENT))).toBeNull();
  });

  it('cooks an unpaid cash-on-delivery phone order (NEW)', () => {
    expect(
      kitchenStageOf(
        order(OrderStatus.PENDING_PAYMENT, {
          paymentMethod: PaymentMethod.CASH,
        }),
      ),
    ).toBe('NEW');
  });

  it('treats an unpaid table or takeaway order as NEW (bill comes later)', () => {
    for (const fulfillmentType of [
      OrderFulfillmentType.DINE_IN,
      OrderFulfillmentType.TAKEAWAY,
    ]) {
      expect(
        kitchenStageOf(
          order(OrderStatus.PENDING_PAYMENT, {
            fulfillmentType,
            paymentMethod: PaymentMethod.CASH,
          }),
        ),
      ).toBe('NEW');
    }
  });
});

describe('kitchenDateStrOf', () => {
  it('reads a UTC-midnight delivery date as that calendar day', () => {
    expect(
      kitchenDateStrOf(
        { deliveryDate: new Date('2026-10-04T00:00:00.000Z') },
        'Asia/Kolkata',
      ),
    ).toBe('2026-10-04');
  });

  it("reads a real moment in the tenant's timezone", () => {
    // 20:00 UTC on the 3rd is 01:30 on the 4th in India.
    expect(
      kitchenDateStrOf(
        { deliveryDate: new Date('2026-10-03T20:00:00.000Z') },
        'Asia/Kolkata',
      ),
    ).toBe('2026-10-04');
  });
});

describe('assertKitchenMove', () => {
  it('allows Start, Mark ready and undoing Mark ready', () => {
    expect(() =>
      assertKitchenMove(order(OrderStatus.CONFIRMED), 'PREPARING'),
    ).not.toThrow();
    expect(() =>
      assertKitchenMove(order(OrderStatus.PREPARING), 'READY'),
    ).not.toThrow();
    expect(() =>
      assertKitchenMove(order(OrderStatus.READY), 'PREPARING'),
    ).not.toThrow();
  });

  it('refuses skipping straight to ready', () => {
    expect(() =>
      assertKitchenMove(order(OrderStatus.CONFIRMED), 'READY'),
    ).toThrow('Start preparing this order first.');
  });

  it('reports a repeated click as a conflict', () => {
    expect(() =>
      assertKitchenMove(order(OrderStatus.PREPARING), 'PREPARING'),
    ).toThrow(ConflictException);
    expect(() => assertKitchenMove(order(OrderStatus.READY), 'READY')).toThrow(
      ConflictException,
    );
  });

  it('refuses orders that left the kitchen, were cancelled or are unpaid', () => {
    expect(() =>
      assertKitchenMove(order(OrderStatus.DELIVERED), 'PREPARING'),
    ).toThrow('This order has already left the kitchen.');
    expect(() =>
      assertKitchenMove(order(OrderStatus.CANCELLED), 'PREPARING'),
    ).toThrow('This order was cancelled.');
    expect(() =>
      assertKitchenMove(order(OrderStatus.PENDING_PAYMENT), 'PREPARING'),
    ).toThrow(BadRequestException);
  });

  it('holds off starting an order the customer asked to cancel', () => {
    expect(() =>
      assertKitchenMove(
        order(OrderStatus.CONFIRMED, { cancelRequested: true }),
        'PREPARING',
      ),
    ).toThrow(KITCHEN_CANCEL_REQUESTED_MESSAGE);
  });
});
