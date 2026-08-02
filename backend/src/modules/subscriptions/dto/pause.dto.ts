import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PauseDto {
  @ApiProperty({
    example: '2026-08-10',
    description: 'YYYY-MM-DD, tenant-local, inclusive',
  })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({
    example: '2026-08-17',
    description: 'YYYY-MM-DD, tenant-local, inclusive',
  })
  @IsDateString()
  dateTo: string;
}
