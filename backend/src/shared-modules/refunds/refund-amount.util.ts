import { BadRequestException } from '@nestjs/common';

/** A refund can never exceed what the customer actually paid, and the
 * deducted fee can never exceed the refund itself — otherwise a typo
 * (₹10,000 instead of ₹100) goes straight into the books, or to Razorpay. */
export function assertRefundAmount(
  amountInPaise: number,
  convenienceFeeInPaise: number,
  paidInPaise: number,
): void {
  if (amountInPaise > paidInPaise) {
    throw new BadRequestException(
      `Refund can't be more than the ₹${(paidInPaise / 100).toFixed(2)} the customer paid.`,
    );
  }
  if (convenienceFeeInPaise > amountInPaise) {
    throw new BadRequestException(
      "The deducted fee can't be more than the refund amount.",
    );
  }
}
