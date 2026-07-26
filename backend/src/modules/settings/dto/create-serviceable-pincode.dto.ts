import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceablePincodeDto {
  @ApiProperty({ example: '400001' })
  @IsString()
  @Matches(/^\d{4,10}$/, { message: 'Pincode must be numeric' })
  pincode: string;

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
