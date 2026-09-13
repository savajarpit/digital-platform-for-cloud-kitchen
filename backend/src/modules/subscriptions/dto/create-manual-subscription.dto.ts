import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const MANUAL_PAYMENT_METHODS = ['CASH', 'UPI'] as const;

/**
 * Everything SubscribeDto already validates (plan, address, coupon,
 * delivery slot) plus the two fields only the admin manual-signup path
 * needs: which customer this is for, and how they paid. RAZORPAY is
 * deliberately not a valid value here — that's the existing customer
 * self-signup path, not this one.
 */
export class CreateManualSubscriptionDto {
  @ApiProperty({
    example: 'b3f1c2a0-...',
    description: "The customer's own user id",
  })
  @IsUUID()
  customerUserId: string;

  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiProperty()
  @IsUUID()
  addressId: string;

  @ApiPropertyOptional({ example: 'FIRSTMONTH20' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({
    description:
      'Default delivery slot for every day, unless overridden per-day',
  })
  @IsOptional()
  @IsUUID()
  deliverySlotId?: string;

  @ApiProperty({ enum: MANUAL_PAYMENT_METHODS })
  @IsIn(MANUAL_PAYMENT_METHODS)
  paymentMethod: (typeof MANUAL_PAYMENT_METHODS)[number];
}
