import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PlanAccentColor,
  SubscriptionOffDayHandling,
  SubscriptionPlanSchedulingMode,
} from '../../../generated/prisma';

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

  @ApiPropertyOptional({
    enum: SubscriptionPlanSchedulingMode,
    default: SubscriptionPlanSchedulingMode.RELATIVE_DAY,
    description:
      "RELATIVE_DAY (default) — days are relative to each subscriber's own start date. " +
      'WEEKLY_FIXED — the menu is pinned to real calendar weekdays (see weekCount/scheduleAnchorDate) so every subscriber eating on the same real day gets the same dish.',
  })
  @IsOptional()
  @IsEnum(SubscriptionPlanSchedulingMode)
  schedulingMode?: SubscriptionPlanSchedulingMode;

  @ApiPropertyOptional({
    example: 2,
    description:
      'WEEKLY_FIXED only — how many distinct authored weeks before the menu loops back to week 1.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  weekCount?: number;

  @ApiPropertyOptional({
    example: '2026-08-24',
    description:
      'WEEKLY_FIXED only — YYYY-MM-DD, tenant-local. The date that defines "week 1" for every subscriber on this plan.',
  })
  @IsOptional()
  @IsDateString()
  scheduleAnchorDate?: string;

  @ApiPropertyOptional({
    enum: SubscriptionOffDayHandling,
    default: SubscriptionOffDayHandling.LOSS_DELIVERY,
    description:
      'WEEKLY_FIXED only — governs an "off day" (a real weekday with no decided meals anywhere on the plan). ' +
      'LOSS_DELIVERY (default) — off days eat into the paid durationDays. ' +
      'EXTEND_TO_COMPENSATE — the schedule stretches past off days so every subscriber still gets exactly durationDays real deliveries.',
  })
  @IsOptional()
  @IsEnum(SubscriptionOffDayHandling)
  offDayHandling?: SubscriptionOffDayHandling;
}
