import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CancellationRequestStatus } from '../../../generated/prisma';

const STATUSES = Object.values(CancellationRequestStatus);

export class QueryCancellationRequestsDto {
  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: CancellationRequestStatus;

  @ApiPropertyOptional({ enum: ['SUBSCRIPTION', 'ORDER'] })
  @IsOptional()
  @IsIn(['SUBSCRIPTION', 'ORDER'])
  type?: 'SUBSCRIPTION' | 'ORDER';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
