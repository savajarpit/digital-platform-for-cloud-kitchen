import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

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

export class UpdateOrderAcceptanceDto {
  @ApiPropertyOptional({ type: OperatingHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OperatingHoursDto)
  operatingHours?: OperatingHoursDto;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @Matches(HHMM, { message: 'dailyCutoffTime must be HH:mm' })
  dailyCutoffTime?: string;

  @ApiPropertyOptional({ example: ['2026-12-25'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  closedDates?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTemporarilyClosed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  closureReason?: string;
}
