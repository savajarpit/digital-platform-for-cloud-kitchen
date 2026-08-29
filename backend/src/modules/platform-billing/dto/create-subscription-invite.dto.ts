import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle } from '../../../generated/prisma';

export class CreateSubscriptionInviteDto {
  @ApiPropertyOptional({
    description:
      'Pick an existing PlatformPlan catalog entry — planCode/billingCycle/amountInPaise are derived from it, ignoring anything else in this body. Omit to specify a one-off/comped deal via the fields below instead.',
  })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ example: 'STANDARD' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  planCode?: string;

  @ApiPropertyOptional({ enum: BillingCycle, example: BillingCycle.MONTHLY })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({
    example: 99900,
    description: 'Amount in paise, per billing cycle',
  })
  @IsOptional()
  @IsInt()
  @Min(100)
  amountInPaise?: number;

  @ApiPropertyOptional({
    example: 14,
    description:
      "Free trial in days — the tenant authorizes payment now but Razorpay won't actually charge until this many days out. Omit for no trial.",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  trialDays?: number;
}
