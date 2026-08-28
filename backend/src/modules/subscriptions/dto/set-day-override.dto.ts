import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetDayOverrideDto {
  @ApiProperty({
    example: '2026-08-10',
    description: 'YYYY-MM-DD, tenant-local',
  })
  @IsDateString()
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
  @MaxLength(500)
  note?: string;
}
