import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryPrepPlanDto {
  @ApiProperty()
  @IsUUID()
  planId!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayNumber!: number;
}
