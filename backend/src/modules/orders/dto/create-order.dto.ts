import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemInputDto {
  @ApiProperty({ example: 'b3f1c2a0-...' })
  @IsUUID()
  mealId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'b3f1c2a0-...' })
  @IsUUID()
  addressId: string;

  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @ApiPropertyOptional({ example: 'Ring the bell twice' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description:
      'Deliver as soon as possible instead of a picked day/slot — requires the tenant to have instant delivery enabled and the kitchen open right now',
  })
  @IsOptional()
  @IsBoolean()
  isInstant?: boolean;

  @ApiPropertyOptional({
    example: '2026-07-27',
    description:
      "Requested delivery date, YYYY-MM-DD, in the tenant's timezone — required unless isInstant is true",
  })
  @ValidateIf((o: CreateOrderDto) => !o.isInstant)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'deliveryDate must be in YYYY-MM-DD format',
  })
  deliveryDate?: string;

  @ApiPropertyOptional({
    example: 'b3f1c2a0-...',
    description: 'Required unless isInstant is true',
  })
  @ValidateIf((o: CreateOrderDto) => !o.isInstant)
  @IsUUID()
  deliverySlotId?: string;

  @ApiPropertyOptional({ example: 'WELCOME10' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  couponCode?: string;
}
