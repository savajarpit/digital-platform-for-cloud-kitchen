import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Longest "ready in" promise an instant order can carry — beyond 4 hours
 * it's a scheduled order, not ASAP. */
export const MAX_INSTANT_ETA_MINUTES = 240;

export class UpdateInstantDeliverySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: 30, minimum: 1, maximum: 240 })
  @IsOptional()
  @IsInt({ message: 'Ready-in times must be whole minutes.' })
  @Min(1, { message: 'The earliest ready-in time must be at least 1 minute.' })
  @Max(MAX_INSTANT_ETA_MINUTES, {
    message: `Ready-in times can be at most ${MAX_INSTANT_ETA_MINUTES} minutes.`,
  })
  etaMinMinutes?: number;

  @ApiPropertyOptional({ example: 45, minimum: 1, maximum: 240 })
  @IsOptional()
  @IsInt({ message: 'Ready-in times must be whole minutes.' })
  @Min(1, { message: 'The latest ready-in time must be at least 1 minute.' })
  @Max(MAX_INSTANT_ETA_MINUTES, {
    message: `Ready-in times can be at most ${MAX_INSTANT_ETA_MINUTES} minutes.`,
  })
  etaMaxMinutes?: number;
}
