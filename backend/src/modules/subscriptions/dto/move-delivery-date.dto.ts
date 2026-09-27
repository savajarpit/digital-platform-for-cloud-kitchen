import { Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class MoveDeliveryDateDto {
  @ApiProperty({
    example: '2026-09-22',
    description: 'The currently-scheduled date to move',
  })
  @Matches(DATE_PATTERN, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiProperty({
    example: '2026-09-25',
    description: 'The new date to move it to',
  })
  @Matches(DATE_PATTERN, { message: 'newDate must be YYYY-MM-DD' })
  newDate!: string;
}
