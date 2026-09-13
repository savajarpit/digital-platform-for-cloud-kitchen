import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QuerySubscriptionAnalyticsDto {
  @ApiPropertyOptional({
    default: 14,
    maximum: 366,
    description:
      'Preset range in days, counting back from today. Ignored if `from`/`to` are given.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(366)
  days?: number;

  @ApiPropertyOptional({
    description: 'Custom range start (YYYY-MM-DD). Requires `to`.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Custom range end (YYYY-MM-DD). Requires `from`.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Scope every figure to a single plan instead of all plans.',
  })
  @IsOptional()
  @IsUUID()
  planId?: string;
}
