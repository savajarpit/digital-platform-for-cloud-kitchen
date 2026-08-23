import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MealWeightUnit } from '../../../generated/prisma';

export class CreateMealDto {
  @ApiProperty({ example: 'Mediterranean Quinoa Bowl' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    example: 'Quinoa, chickpeas, feta, olives, herb dressing.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/meals/quinoa-bowl.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 24900, description: 'Price in paise (₹249.00)' })
  @IsInt()
  @Min(0)
  priceInPaise: number;

  @ApiPropertyOptional({ example: 'b3f1c2a0-...' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: { calories: 420, protein: '18g' } })
  @IsOptional()
  @IsObject()
  nutrition?: Record<string, unknown>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isVegetarian?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @ApiPropertyOptional({
    example: 250,
    description:
      'Item weight, e.g. 250 for "250 g" — omit to hide the weight badge on the menu card',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weightValue?: number;

  @ApiPropertyOptional({ enum: MealWeightUnit, example: MealWeightUnit.G })
  @IsOptional()
  @IsEnum(MealWeightUnit)
  weightUnit?: MealWeightUnit;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyQuantityLimit?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
