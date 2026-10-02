import { BadRequestException } from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../generated/prisma';

/**
 * Which plain status changes an admin may make. A paid order can move to
 * any settable status. An unpaid one can only be CANCELLED, and only when
 * it's a cash/UPI order staff created (a phone order the customer backed
 * out of, a walk-in who left) — with no money taken there's nothing to
 * refund, and until now such an order could never be closed at all, so it
 * sat in the kitchen list and held its daily stock forever. An unpaid
 * Razorpay order stays untouched: its payment may still land, and the
 * abandoned ones already drop out of lists and stock on their own.
 */
export function assertStatusChangeAllowed(
  order: {
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
  },
  nextStatus: OrderStatus,
): void {
  if (order.status === OrderStatus.CANCELLED) {
    throw new BadRequestException('This order is already cancelled.');
  }
  if (order.paymentStatus === PaymentStatus.PAID) {
    // Money was taken, so cancelling must leave a refund record — only the
    // Cancel & Refund action does that (even a ₹0 "no refund" is recorded).
    if (nextStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'This order is paid — use Cancel & Refund so the refund is recorded.',
      );
    }
    return;
  }
  const cancellingUnpaidManual =
    nextStatus === OrderStatus.CANCELLED &&
    order.paymentMethod !== PaymentMethod.RAZORPAY;
  if (!cancellingUnpaidManual) {
    throw new BadRequestException(
      'Cannot update the status of an order that has not been paid yet.',
    );
  }
}
