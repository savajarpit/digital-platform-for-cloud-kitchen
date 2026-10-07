import { BadRequestException } from '@nestjs/common';
import { assertStatusChangeAllowed } from './order-status-rules';

const unpaidCash = {
  status: 'PENDING_PAYMENT' as const,
  paymentStatus: 'PENDING' as const,
  paymentMethod: 'CASH' as const,
};

describe('assertStatusChangeAllowed', () => {
  it('lets staff cancel an unpaid cash/UPI order', () => {
    expect(() =>
      assertStatusChangeAllowed(unpaidCash, 'CANCELLED'),
    ).not.toThrow();
    expect(() =>
      assertStatusChangeAllowed(
        { ...unpaidCash, paymentMethod: 'UPI' },
        'CANCELLED',
      ),
    ).not.toThrow();
  });

  it('moves an unpaid cash/UPI order along before payment (cash on delivery)', () => {
    for (const next of [
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ] as const) {
      expect(() => assertStatusChangeAllowed(unpaidCash, next)).not.toThrow();
    }
  });

  it('blocks any change on an unpaid online (Razorpay) order', () => {
    expect(() =>
      assertStatusChangeAllowed(
        { ...unpaidCash, paymentMethod: 'RAZORPAY' },
        'PREPARING',
      ),
    ).toThrow(
      'Cannot update the status of an order that has not been paid yet.',
    );
  });

  it('never cancels an unpaid Razorpay order (its payment may still land)', () => {
    expect(() =>
      assertStatusChangeAllowed(
        { ...unpaidCash, paymentMethod: 'RAZORPAY' },
        'CANCELLED',
      ),
    ).toThrow(BadRequestException);
  });

  it('allows any change on a paid order but not on a cancelled one', () => {
    const paid = {
      status: 'CONFIRMED' as const,
      paymentStatus: 'PAID' as const,
      paymentMethod: 'RAZORPAY' as const,
    };
    expect(() => assertStatusChangeAllowed(paid, 'PREPARING')).not.toThrow();
    expect(() => assertStatusChangeAllowed(paid, 'CANCELLED')).toThrow(
      'Cancel & Refund',
    );
    expect(() =>
      assertStatusChangeAllowed({ ...paid, status: 'CANCELLED' }, 'PREPARING'),
    ).toThrow('already cancelled');
  });

  it('never cancels a plan delivery on its own, but still lets the kitchen move it along', () => {
    const planDelivery = {
      status: 'CONFIRMED' as const,
      paymentStatus: 'PAID' as const,
      paymentMethod: 'RAZORPAY' as const,
      subscriptionId: 'sub1',
    };
    expect(() => assertStatusChangeAllowed(planDelivery, 'CANCELLED')).toThrow(
      'part of a meal plan',
    );
    expect(() =>
      assertStatusChangeAllowed(planDelivery, 'OUT_FOR_DELIVERY'),
    ).not.toThrow();
  });
});
