import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
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

  @ApiProperty({
    example: '2026-07-26T18:30:00.000Z',
    description: 'Customer-requested delivery time (ISO 8601)',
  })
  @IsDateString()
  requestedDeliveryTime: string;
}
