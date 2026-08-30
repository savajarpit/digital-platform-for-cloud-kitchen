import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeclareDisruptionDto {
  @ApiProperty({
    example: '2026-09-01',
    description: 'YYYY-MM-DD, tenant-local — must not be in the past',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    example: 'Heavy rain — kitchen unable to prepare or dispatch today.',
    description: 'Shown to every affected customer, exactly as typed.',
  })
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description:
      'How many extra delivery days to credit each affected subscriber.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  compensationDays?: number;

  @ApiProperty({
    enum: ['SINGLE', 'PLAN'],
    example: 'SINGLE',
    description:
      'SINGLE — one subscriber (subscriptionId required). PLAN — every currently-ACTIVE subscriber of a plan (planId required).',
  })
  @IsIn(['SINGLE', 'PLAN'])
  scope: 'SINGLE' | 'PLAN';

  @ApiPropertyOptional({ description: 'Required when scope is SINGLE' })
  @ValidateIf((o: DeclareDisruptionDto) => o.scope === 'SINGLE')
  @IsUUID()
  subscriptionId?: string;

  @ApiPropertyOptional({ description: 'Required when scope is PLAN' })
  @ValidateIf((o: DeclareDisruptionDto) => o.scope === 'PLAN')
  @IsUUID()
  planId?: string;
}
