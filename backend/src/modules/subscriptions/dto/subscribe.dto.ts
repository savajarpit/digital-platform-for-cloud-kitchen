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
}
