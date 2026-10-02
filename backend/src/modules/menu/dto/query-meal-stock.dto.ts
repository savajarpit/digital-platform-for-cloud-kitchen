import { Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryMealStockDto {
  @ApiProperty({
    example: '2026-09-28',
    description: 'Delivery date, YYYY-MM-DD',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;
}
