import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MAX_CART_LINES } from '../../../common/constants/order-limits.constant';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemInputDto } from './create-order.dto';

export class PreviewOrderDto {
  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_CART_LINES, {
    message: `An order can have at most ${MAX_CART_LINES} different lines.`,
  })
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @ApiPropertyOptional({ example: 'WELCOME10' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  couponCode?: string;
}
