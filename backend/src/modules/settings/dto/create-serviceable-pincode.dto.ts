import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MAX_DELIVERY_AMOUNT_PAISE } from '../kitchen-zone-rules';

export class CreateServiceablePincodeDto {
  @ApiProperty({ example: '400001' })
  @IsString()
  @Matches(/^\d{4,10}$/, { message: 'Pincode must be numeric' })
  pincode: string;

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
}
