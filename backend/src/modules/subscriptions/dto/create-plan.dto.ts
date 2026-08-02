import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanAccentColor } from '../../../generated/prisma';

export class CreatePlanDto {
  @ApiProperty({ example: '7-Day Weight Loss Plan' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'A calorie-controlled plan for steady weight loss.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(1)
  durationDays: number;

  @ApiProperty({ example: 199900, description: 'Full plan price in paise' })
  @IsInt()
  @Min(1)
  priceInPaise: number;

  @ApiPropertyOptional({
    example: ['Free delivery', 'Skip or pause anytime'],
    description: 'Storefront card bullet points',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  features?: string[];

  @ApiPropertyOptional({ example: 'Most Popular' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  badgeText?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Highlights the card, uses the solid-primary badge style',
  })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @ApiPropertyOptional({
    enum: PlanAccentColor,
    example: PlanAccentColor.PRIMARY,
  })
  @IsOptional()
  @IsEnum(PlanAccentColor)
  accentColor?: PlanAccentColor;
}
