import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponDiscountType, PromoAppliesTo } from '../../../generated/prisma';

export class CreateCouponDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,30}$/, {
    message: 'Code must be 3-30 characters: letters, numbers, - or _',
  })
  code: string;

  @ApiProperty({
    enum: CouponDiscountType,
    example: CouponDiscountType.PERCENTAGE,
  })
  @IsEnum(CouponDiscountType)
  discountType: CouponDiscountType;

  @ApiProperty({
    example: 10,
    description:
      'Percentage (1-100) or flat amount in paise, depending on discountType',
  })
  @IsInt()
  @Min(1)
  discountValue: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Minimum order subtotal in paise',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderAmountInPaise?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsesTotal?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsesPerUser?: number;

  @ApiPropertyOptional({ example: '2026-08-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    enum: PromoAppliesTo,
    example: PromoAppliesTo.ORDERS,
    description:
      'Redeemable at order checkout, plan signup, or both — defaults to ORDERS',
  })
  @IsOptional()
  @IsEnum(PromoAppliesTo)
  appliesTo?: PromoAppliesTo;
}
