import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { BillingCycle } from '../../../generated/prisma';

export class UpsertPlatformPlanDto {
  @ApiProperty({ example: 'Starter' })
  @IsString()
  @MaxLength(60)
  name: string;

  @ApiProperty({ example: 100000 })
  @IsInt()
  @Min(0)
  priceInPaise: number;

  @ApiProperty({ enum: BillingCycle, example: BillingCycle.MONTHLY })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(0)
  defaultMaxOrdersPerMonth: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  defaultMaxSubscribers: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
