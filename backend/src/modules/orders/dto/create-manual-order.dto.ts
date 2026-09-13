import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateOrderDto } from './create-order.dto';

const MANUAL_PAYMENT_METHODS = ['CASH', 'UPI'] as const;

/**
 * Everything CreateOrderDto already validates (cart, address/pickup,
 * delivery slot, coupon, etc.) plus the two fields only the admin manual-
 * order path needs: which customer this is for, and how they paid.
 * RAZORPAY is deliberately not a valid value here — that's the existing
 * customer self-checkout path, not this one.
 */
export class CreateManualOrderDto extends CreateOrderDto {
  @ApiProperty({
    example: 'b3f1c2a0-...',
    description: "The customer's own user id",
  })
  @IsUUID()
  customerUserId: string;

  @ApiProperty({ enum: MANUAL_PAYMENT_METHODS })
  @IsIn(MANUAL_PAYMENT_METHODS)
  paymentMethod: (typeof MANUAL_PAYMENT_METHODS)[number];

  @ApiPropertyOptional({
    description:
      "Proceed even though the address falls outside this tenant's configured serviceable areas — a manual order already means a human is vouching for it. Ignored for PICKUP.",
  })
  @IsOptional()
  @IsBoolean()
  overrideServiceability?: boolean;
}
