import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MealWeightUnit } from '../../../generated/prisma';

/** ₹1,00,000 — far above any real dish, well inside a 32-bit int (a bigger
 * number used to crash the insert with a 500). */
export const MAX_MEAL_PRICE_IN_PAISE = 10_000_000;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** http(s) only — an image link is put straight into <img src>. Localhost
 * is allowed for local development (no TLD). */
const IMAGE_URL_OPTIONS = {
  protocols: ['http', 'https'],
  require_protocol: true,
  require_tld: false,
};

/** The four values the meal form edits — nothing else is stored. */
export class MealNutritionDto {
  @ApiPropertyOptional({ example: 420 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  calories?: number;

  @ApiPropertyOptional({ example: '18g' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  protein?: string;

  @ApiPropertyOptional({ example: '45g' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  carbs?: string;

  @ApiPropertyOptional({ example: '16g' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  fat?: string;
}

export class CreateMealDto {
  @ApiProperty({ example: 'Mediterranean Quinoa Bowl' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Give the meal a name.' })
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    example: 'Quinoa, chickpeas, feta, olives, herb dressing.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/meals/quinoa-bowl.jpg',
    description: 'Empty string or null removes the image',
  })
  @IsOptional()
  // The form sends "" when the image is removed.
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @IsUrl(IMAGE_URL_OPTIONS, { message: 'Image must be an http(s) link.' })
  @MaxLength(2048)
  imageUrl?: string | null;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Gallery images for the meal detail page — additive to imageUrl, not a replacement.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl(IMAGE_URL_OPTIONS, {
    each: true,
    message: 'Each gallery image must be an http(s) link.',
  })
  @MaxLength(2048, { each: true })
  imageUrls?: string[];

  @ApiProperty({ example: 24900, description: 'Price in paise (₹249.00)' })
  @IsInt()
  @Min(0)
  @Max(MAX_MEAL_PRICE_IN_PAISE, {
    message: 'Price can be at most ₹1,00,000.',
  })
  priceInPaise: number;

  @ApiPropertyOptional({ example: 'b3f1c2a0-...' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ type: MealNutritionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MealNutritionDto)
  nutrition?: MealNutritionDto;

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
  @Max(100000, { message: 'Weight can be at most 100000.' })
  weightValue?: number;

  @ApiPropertyOptional({ enum: MealWeightUnit, example: MealWeightUnit.G })
  @IsOptional()
  @IsEnum(MealWeightUnit)
  weightUnit?: MealWeightUnit;

  // Plates per delivery date (Petpooja-style daily stock, see
  // MealStockService). null clears it back to unlimited.
  @ApiPropertyOptional({ example: 50, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1, {
    message: 'Daily limit must be at least 1 — leave it blank for unlimited.',
  })
  @Max(100000)
  dailyQuantityLimit?: number | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;
}
