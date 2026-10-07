import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Furthest ahead a customer can schedule an order. Checkout lists every
 * day up to it, so it has to stay a short, real-world window. */
export const MAX_ADVANCE_ORDER_DAYS = 30;

/**
 * Kitchen location/radius/fee fields moved to the KitchenZone CRUD
 * (multi-outlet support) — this endpoint now only carries the one
 * remaining tenant-wide delivery-window setting.
 */
export class UpdateDeliveryZonesDto {
  @ApiPropertyOptional({
    example: 2,
    minimum: 0,
    maximum: MAX_ADVANCE_ORDER_DAYS,
    description: '0 = today only',
  })
  @IsOptional()
  @IsInt({ message: 'Advance order days must be a whole number.' })
  @Min(0, { message: 'Advance order days can’t be negative.' })
  @Max(MAX_ADVANCE_ORDER_DAYS, {
    message: `Customers can order at most ${MAX_ADVANCE_ORDER_DAYS} days ahead.`,
  })
  maxAdvanceOrderDays?: number;
}
