import { ApiProperty } from '@nestjs/swagger';
import { IsDateStr } from '../../../common/decorators/is-date-str.decorator';

export class SkipDayDto {
  @ApiProperty({
    example: '2026-08-10',
    description: 'YYYY-MM-DD, tenant-local',
  })
  @IsDateStr()
  date: string;
}
