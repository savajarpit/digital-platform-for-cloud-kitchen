import {
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @Min(0)
  radiusMeters: number;

  @ApiPropertyOptional({ example: 3000, description: 'Delivery fee in paise' })
  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional({
    example: 15000,
    description: 'Minimum order amount in paise',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({
    example: 20000,
    description: 'Free-delivery threshold in paise',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  freeDeliveryAboveAmount?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
