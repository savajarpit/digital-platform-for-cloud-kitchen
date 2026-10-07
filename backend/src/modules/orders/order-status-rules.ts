import { BadRequestException } from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../generated/prisma';

/** A subscription's daily delivery was paid for with the plan, so it's never
 * cancelled (or refunded) on its own — skipping the day or declaring a
 * disruption gives the day back at the end of the plan instead. */
export const PLAN_DELIVERY_CANCEL_MESSAGE =
  'This delivery is part of a meal plan — skip the day or declare a disruption from the subscription instead, so the customer gets the day back.';

/**
 * Which plain status changes an admin may make. A paid order can move to
 * any settable status except CANCELLED (that needs Cancel & Refund). An
 * unpaid cash/UPI order staff created is cash on delivery (Arpit,
 * 2026-10-04): it's cooked and delivered before the money is collected, so
 * it can move to any status — including CANCELLED, since with no money
 * taken there's nothing to refund. An unpaid Razorpay order stays
 * untouched: its payment may still land, and the abandoned ones already
 * drop out of lists and stock on their own.
 */
export function assertStatusChangeAllowed(
  order: {
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    subscriptionId?: string | null;
  },
  nextStatus: OrderStatus,
): void {
  if (order.status === OrderStatus.CANCELLED) {
    throw new BadRequestException('This order is already cancelled.');
  }
  if (order.subscriptionId && nextStatus === OrderStatus.CANCELLED) {
    throw new BadRequestException(PLAN_DELIVERY_CANCEL_MESSAGE);
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
  if (order.paymentMethod === PaymentMethod.RAZORPAY) {
    throw new BadRequestException(
      'Cannot update the status of an order that has not been paid yet.',
    );
  }
}
