import {
  ArrayMaxSize,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscribeDto {
  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiProperty()
  @IsUUID()
  addressId: string;

  @ApiPropertyOptional({ example: 'FIRSTMONTH20' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({
    description:
      'Default delivery slot for every day, unless overridden per-day',
  })
  @IsOptional()
  @IsUUID()
  deliverySlotId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['2026-09-23', '2026-09-24', '2026-09-25'],
    description:
      "Required (exactly the plan's effective duration in count) only when the tenant has delivery date selection enabled — the customer's chosen delivery dates, YYYY-MM-DD tenant-local. Ignored/rejected otherwise.",
  })
  @IsOptional()
  @ArrayMaxSize(120)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true })
  deliveryDates?: string[];
}
