import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Kitchen location/radius/fee fields moved to the KitchenZone CRUD
 * (multi-outlet support) — this endpoint now only carries the one
 * remaining tenant-wide delivery-window setting.
 */
export class UpdateDeliveryZonesDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxAdvanceOrderDays?: number;
}
