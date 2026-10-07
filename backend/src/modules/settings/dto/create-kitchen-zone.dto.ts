import {
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MAX_DELIVERY_AMOUNT_PAISE,
  MAX_ZONE_RADIUS_METERS,
  MIN_ZONE_RADIUS_METERS,
} from '../kitchen-zone-rules';

export class CreateKitchenZoneDto {
  @ApiProperty({ example: 'Nikol Branch' })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 23.0225 })
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 72.5714 })
  @IsLongitude()
  lng: number;

  @ApiProperty({ example: 3000, description: 'Delivery radius in meters' })
  @IsInt()
  @Min(MIN_ZONE_RADIUS_METERS, {
    message: 'Delivery radius must be at least 100 m.',
  })
  @Max(MAX_ZONE_RADIUS_METERS, {
    message: 'Delivery radius can be at most 50 km.',
  })
  radiusMeters: number;

  @ApiPropertyOptional({ example: 3000, description: 'Delivery fee in paise' })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Delivery fee can’t be negative.' })
  @Max(MAX_DELIVERY_AMOUNT_PAISE, {
    message: 'Delivery fee can be at most ₹10,000.',
  })
  deliveryFee?: number;

  @ApiPropertyOptional({
    example: 15000,
    description: 'Minimum order amount in paise',
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Minimum order amount can’t be negative.' })
  @Max(MAX_DELIVERY_AMOUNT_PAISE, {
    message: 'Minimum order amount can be at most ₹10,000.',
  })
  minOrderAmount?: number;

  @ApiPropertyOptional({
    example: 20000,
    description: 'Free-delivery threshold in paise',
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Free-delivery threshold can’t be negative.' })
  @Max(MAX_DELIVERY_AMOUNT_PAISE, {
    message: 'Free-delivery threshold can be at most ₹10,000.',
  })
  freeDeliveryAboveAmount?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      "This zone's own pickup opt-in — only takes effect once the tenant's Business Profile pickupEnabled master switch is also on",
  })
  @IsOptional()
  @IsBoolean()
  pickupEnabled?: boolean;

  @ApiPropertyOptional({
    example: '221B Baker Street, Ahmedabad — 380001',
    description: 'Customer-facing pickup address — name above is admin-only',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  pickupAddress?: string;
}
