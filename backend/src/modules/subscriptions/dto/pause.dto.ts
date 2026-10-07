import { ApiProperty } from '@nestjs/swagger';
import { IsDateStr } from '../../../common/decorators/is-date-str.decorator';

export class PauseDto {
  @ApiProperty({
    example: '2026-08-10',
    description: 'YYYY-MM-DD, tenant-local, inclusive',
  })
  @IsDateStr()
  dateFrom: string;

  @ApiProperty({
    example: '2026-08-17',
    description: 'YYYY-MM-DD, tenant-local, inclusive',
  })
  @IsDateStr()
  dateTo: string;
}
