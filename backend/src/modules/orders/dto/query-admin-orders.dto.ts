import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OffsetPaginationDto } from '../../../common/dto/pagination.dto';
import { OrderFulfillmentType, OrderStatus } from '../../../generated/prisma';

export class QueryAdminOrdersDto extends OffsetPaginationDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: OrderFulfillmentType })
  @IsOptional()
  @IsEnum(OrderFulfillmentType)
  fulfillmentType?: OrderFulfillmentType;
}
