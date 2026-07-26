import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDeliveryZonesDto {
  @ApiPropertyOptional({ example: 23.0225 })
  @IsOptional()
  @IsLatitude()
  kitchenLat?: number;

  @ApiPropertyOptional({ example: 72.5714 })
  @IsOptional()
  @IsLongitude()
  kitchenLng?: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Delivery radius in meters',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryRadiusMeters?: number;

  @ApiPropertyOptional({
    example: 3000,
    description: 'Flat delivery fee in paise, geo mode',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional({
    example: 15000,
    description: 'Minimum order amount in paise, geo mode',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({
    example: 20000,
    description: 'Free-delivery threshold in paise, geo mode',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  freeDeliveryAboveAmount?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxAdvanceOrderDays?: number;
}
