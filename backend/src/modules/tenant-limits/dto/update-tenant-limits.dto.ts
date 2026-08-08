import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantLimitsDto {
  @ApiPropertyOptional({
    description:
      'Extra order cap on top of (or instead of) the plan default — null clears the override back to the plan default',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxOrdersOverride?: number | null;

  @ApiPropertyOptional({
    description: 'Extra subscriber cap on top of the plan default',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxSubscribersOverride?: number | null;

  @ApiPropertyOptional({
    description:
      'Off by default for every tenant — a defensive lever, not plan-tier-based',
  })
  @IsOptional()
  @IsBoolean()
  signupLimitEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxSignupsPerMonth?: number | null;
}
