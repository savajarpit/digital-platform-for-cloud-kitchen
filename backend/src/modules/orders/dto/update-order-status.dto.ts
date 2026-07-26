import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../../generated/prisma';

/**
 * Deliberately excludes PENDING_PAYMENT and CONFIRMED — those are only ever
 * set by the payment-verify/webhook flow, never by an admin manually
 * clicking a status dropdown. This endpoint is for post-payment kitchen/
 * delivery progression only.
 */
const ADMIN_SETTABLE_STATUSES = [
  OrderStatus.PREPARING,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
] as const;

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ADMIN_SETTABLE_STATUSES })
  @IsIn(ADMIN_SETTABLE_STATUSES)
  status: (typeof ADMIN_SETTABLE_STATUSES)[number];
}
