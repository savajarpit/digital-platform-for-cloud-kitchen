import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateDeliverySlotDto {
  @ApiProperty({ example: 'Lunch' })
  @IsString()
  @MaxLength(40)
  name: string;

  @ApiProperty({ example: '12:00' })
  @Matches(HHMM, { message: 'startTime must be HH:mm' })
  startTime: string;

  @ApiProperty({ example: '15:00' })
  @Matches(HHMM, { message: 'endTime must be HH:mm' })
  endTime: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
