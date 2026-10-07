import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateStr } from '../../../common/decorators/is-date-str.decorator';

export class SetDayOverrideDto {
  @ApiProperty({
    example: '2026-08-10',
    description: 'YYYY-MM-DD, tenant-local',
  })
  @IsDateStr()
  date: string;

  @ApiPropertyOptional({
    description: 'Omit to leave the address unchanged for this day',
  })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiPropertyOptional({
    description: 'Omit to leave the delivery slot unchanged for this day',
  })
  @IsOptional()
  @IsUUID()
  deliverySlotId?: string;

  @ApiPropertyOptional({
    example: 'No onions please',
    description: 'A prep/customization note for this one delivery',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Keep the note under 500 characters.' })
  note?: string;
}
