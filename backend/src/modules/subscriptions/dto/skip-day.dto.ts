import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SkipDayDto {
  @ApiProperty({
    example: '2026-08-10',
    description: 'YYYY-MM-DD, tenant-local',
  })
  @IsDateString()
  date: string;
}
