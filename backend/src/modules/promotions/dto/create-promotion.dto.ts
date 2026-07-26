import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PromotionType } from '../../../generated/prisma';

export class CreatePromotionDto {
  @ApiProperty({ enum: PromotionType, example: PromotionType.SCHEDULED_DISCOUNT })
  @IsEnum(PromotionType)
  type: PromotionType;

  @ApiProperty({ example: 'Happy Hour 5% Off' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // BOGO
  @ApiPropertyOptional({ description: 'BOGO: the meal the customer must buy' })
  @IsOptional()
  @IsUUID()
  buyMealId?: string;

  @ApiPropertyOptional({ example: 2, description: 'BOGO: quantity of buyMealId required' })
  @IsOptional()
  @IsInt()
  @Min(1)
  buyQuantity?: number;

  @ApiPropertyOptional({
    description: 'BOGO: the meal given free (defaults to buyMealId if omitted)',
  })
  @IsOptional()
  @IsUUID()
  getMealId?: string;

  @ApiPropertyOptional({ example: 1, description: 'BOGO: quantity given free' })
  @IsOptional()
  @IsInt()
  @Min(1)
  getQuantity?: number;

  // FREE_ITEM_ON_MINIMUM
  @ApiPropertyOptional({
    example: 50000,
    description: 'FREE_ITEM_ON_MINIMUM: cart subtotal (paise) that unlocks the free item',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderAmountInPaise?: number;

  @ApiPropertyOptional({ description: 'FREE_ITEM_ON_MINIMUM: the meal given free' })
  @IsOptional()
  @IsUUID()
  freeMealId?: string;

  // SCHEDULED_DISCOUNT
  @ApiPropertyOptional({ example: 15, description: 'SCHEDULED_DISCOUNT: percentage off, 1-100' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({
    example: [1, 2, 3, 4, 5],
    description: 'SCHEDULED_DISCOUNT: 0=Sun..6=Sat; empty/omitted = every day',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @ArrayMaxSize(7)
  daysOfWeek?: number[];

  @ApiPropertyOptional({ example: '16:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  @ApiPropertyOptional({ description: 'SCHEDULED_DISCOUNT: meal ids to scope the discount to' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mealIds?: string[];

  @ApiPropertyOptional({ description: 'SCHEDULED_DISCOUNT: category ids to scope the discount to' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ example: false, description: 'SCHEDULED_DISCOUNT: apply storewide' })
  @IsOptional()
  @IsBoolean()
  storewide?: boolean;
}
