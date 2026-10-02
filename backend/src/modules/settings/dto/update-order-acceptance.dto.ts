import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ClosedDateAppliesTo } from '../../../common/utils/closed-dates.util';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class DayHoursDto {
  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(HHMM, { message: 'open must be HH:mm' })
  open?: string;

  @ApiPropertyOptional({ example: '21:00' })
  @IsOptional()
  @Matches(HHMM, { message: 'close must be HH:mm' })
  close?: string;
}

export class OperatingHoursDto {
  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  mon?: DayHoursDto;
  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  tue?: DayHoursDto;
  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  wed?: DayHoursDto;
  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  thu?: DayHoursDto;
  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  fri?: DayHoursDto;
  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  sat?: DayHoursDto;
  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  sun?: DayHoursDto;
}

export class ClosedDateDto {
  @ApiProperty({
    example: '2026-11-08',
    description: 'YYYY-MM-DD, tenant-local',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({ example: 'Diwali' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({
    example: 'We are closed for the festival. Deliveries resume the next day.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @ApiPropertyOptional({
    enum: ['ORDERS', 'SUBSCRIPTIONS', 'BOTH'],
    default: 'ORDERS',
    description:
      'SUBSCRIPTIONS/BOTH also skip subscription deliveries and require the "plan-calendar-view" feature',
  })
  @IsOptional()
  @IsIn(['ORDERS', 'SUBSCRIPTIONS', 'BOTH'])
  appliesTo?: ClosedDateAppliesTo;
}

export class UpdateOrderAcceptanceDto {
  @ApiPropertyOptional({ type: OperatingHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OperatingHoursDto)
  operatingHours?: OperatingHoursDto;

  @ApiPropertyOptional({
    example: '18:00',
    nullable: true,
    description: 'null removes the cutoff',
  })
  @IsOptional()
  @Matches(HHMM, { message: 'dailyCutoffTime must be HH:mm' })
  dailyCutoffTime?: string | null;

  @ApiPropertyOptional({ type: [ClosedDateDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(400)
  @ValidateNested({ each: true })
  @Type(() => ClosedDateDto)
  closedDates?: ClosedDateDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTemporarilyClosed?: boolean;

  @ApiPropertyOptional({
    maxLength: 200,
    nullable: true,
    description: 'null or blank removes the reason',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: 'Closure reason can be at most 200 characters.',
  })
  closureReason?: string | null;

  // Only has an effect while SUPER_ADMIN grants `order-cancel-requests`.
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowOrderCancelRequests?: boolean;
}
