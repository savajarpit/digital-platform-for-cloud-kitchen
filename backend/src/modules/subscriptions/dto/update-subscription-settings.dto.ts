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
      "Minimum lead time (hours) for skip/pause/day-override edits, and how far out a new signup's Day 1 is pushed",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  noticeHoursBeforeDelivery?: number;
}
