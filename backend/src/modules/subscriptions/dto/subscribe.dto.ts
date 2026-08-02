import { IsOptional, IsString, IsUUID } from 'class-validator';
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
}
