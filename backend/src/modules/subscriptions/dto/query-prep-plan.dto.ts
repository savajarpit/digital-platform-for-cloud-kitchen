import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QueryPrepPlanDto {
  @ApiProperty()
  @IsUUID()
  planId!: string;

  @ApiPropertyOptional({
    example: 1,
    description:
      'RELATIVE_DAY plans only — required. WEEKLY_FIXED plans resolve "today" server-side instead and ignore this.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayNumber?: number;
}
