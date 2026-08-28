import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSubscriptionSettingsDto {
  @ApiPropertyOptional({
    example: true,
    description:
      'Master switch — when false, /plans is hidden everywhere on the storefront (nav, footer, home page) and direct navigation to it redirects away. Existing subscribers keep access to "My Subscriptions".',
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAcceptingNewSubscriptions?: boolean;

  @ApiPropertyOptional({ example: 'Kitchen at capacity — back Monday' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  closureReason?: string;

  @ApiPropertyOptional({
    example: 24,
    description:
      'Minimum lead time (hours) for skip/pause/day-override edits',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  noticeHoursBeforeDelivery?: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      "Days before a new subscriber's first delivery — 0 for same-day (materialized immediately on payment instead of waiting for the nightly job)",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(14)
  startDateLeadDays?: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'Show the plans block on the home page (only if a published plan also exists)',
  })
  @IsOptional()
  @IsBoolean()
  showOnHomepage?: boolean;

  @ApiPropertyOptional({ example: 'Meal Plans' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  homepageTitle?: string;

  @ApiPropertyOptional({
    example:
      'Pick a plan that fits your lifestyle — skip, pause, or cancel anytime',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  homepageDescription?: string;

  @ApiPropertyOptional({ example: 'Choose Your Plan' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  plansPageTitle?: string;

  @ApiPropertyOptional({
    example:
      'Flexible subscription plans that adapt to your routine. Skip, pause, or cancel — no lock-in, ever.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  plansPageSubtitle?: string;

  @ApiPropertyOptional({
    example: true,
    description: '"Why subscribe?" section on /plans',
  })
  @IsOptional()
  @IsBoolean()
  whySubscribeEnabled?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'FAQ accordion on /plans',
  })
  @IsOptional()
  @IsBoolean()
  faqEnabled?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: '"Still have questions?" CTA on /plans',
  })
  @IsOptional()
  @IsBoolean()
  contactCtaEnabled?: boolean;

  @ApiPropertyOptional({ example: 'Still have questions?' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactCtaTitle?: string;

  @ApiPropertyOptional({
    example: 'Our team is happy to help you find the right plan.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  contactCtaDescription?: string;

  @ApiPropertyOptional({
    example: 'support@example.com',
    description: 'Falls back to Business Profile support email when unset',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactEmail?: string;
}
