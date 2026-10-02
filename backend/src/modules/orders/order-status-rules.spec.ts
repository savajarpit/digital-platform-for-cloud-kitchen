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

  it('blocks any other change on an unpaid order', () => {
    expect(() => assertStatusChangeAllowed(unpaidCash, 'PREPARING')).toThrow(
      BadRequestException,
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
});
