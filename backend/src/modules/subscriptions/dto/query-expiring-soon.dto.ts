import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryExpiringSoonDto {
  @ApiPropertyOptional({
    default: 7,
    maximum: 90,
    description:
      'Count/list ACTIVE subscriptions whose cycleEnd falls within this many days from today.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  withinDays?: number;
}
