import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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
import { IsDateStr } from '../../../common/decorators/is-date-str.decorator';

/** Longest plan — a year; materialization, calendars and previews all walk
 * the plan day by day. */
export const MAX_PLAN_DURATION_DAYS = 365;
/** ₹5,00,000 — the usual per-transaction ceiling for an online payment. */
export const MAX_PLAN_PRICE_PAISE = 50_000_000;

export class CreatePlanDto {
  @ApiProperty({ example: '7-Day Weight Loss Plan' })
  @IsString()
  @MaxLength(100, { message: 'Plan name can be at most 100 characters.' })
  name: string;

  @ApiPropertyOptional({
    example: 'A calorie-controlled plan for steady weight loss.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'Description can be at most 2,000 characters.',
  })
  description?: string;

  @ApiProperty({ example: 7 })
  @IsInt({ message: 'Duration must be a whole number of days.' })
  @Min(1, { message: 'A plan must last at least 1 day.' })
  @Max(MAX_PLAN_DURATION_DAYS, {
    message: `A plan can last at most ${MAX_PLAN_DURATION_DAYS} days.`,
  })
  durationDays: number;

  @ApiProperty({ example: 199900, description: 'Full plan price in paise' })
  @IsInt({ message: 'Price must be in whole paise.' })
  @Min(1, { message: 'Price must be at least ₹0.01.' })
  @Max(MAX_PLAN_PRICE_PAISE, {
    message:
      'Price can be at most ₹5,00,000 — the most one online payment can take.',
  })
  priceInPaise: number;

  @ApiPropertyOptional({
    example: ['Free delivery', 'Skip or pause anytime'],
    description: 'Storefront card bullet points',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, {
    each: true,
    message: 'Each feature can be at most 80 characters.',
  })
  @ArrayMaxSize(10, { message: 'Add at most 10 features.' })
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
  @IsDateStr()
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
