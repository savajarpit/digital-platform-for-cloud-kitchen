import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
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

  /** Only orders with a customer cancellation request awaiting a decision. */
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  cancelRequested?: boolean;
}
