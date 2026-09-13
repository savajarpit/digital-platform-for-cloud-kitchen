import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemInputDto } from './create-order.dto';

const DINE_IN_FULFILLMENT_TYPES = ['DINE_IN', 'TAKEAWAY'] as const;

/**
 * A running order opened at the counter — deliberately minimal, matching a
 * real POS: every guest field is optional (a walk-in doesn't get asked for
 * a name/phone just to order), items can start empty (add rounds later via
 * POST admin/:id/items), and there's no address/slot/date at all — none of
 * that applies to in-store service.
 */
export class CreateDineInOrderDto {
  @ApiProperty({
    example: 'b3f1c2a0-...',
    description: 'Which outlet (KitchenZone) took this order',
  })
  @IsUUID()
  kitchenZoneId: string;

  @ApiProperty({ enum: DINE_IN_FULFILLMENT_TYPES })
  @IsIn(DINE_IN_FULFILLMENT_TYPES)
  fulfillmentType: (typeof DINE_IN_FULFILLMENT_TYPES)[number];

  @ApiPropertyOptional({
    example: 'b3f1c2a0-...',
    description:
      'DINE_IN only — can be left unset and assigned later via POST admin/:id/assign-table',
  })
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @ApiPropertyOptional({
    description: 'Link to a real registered customer — never required',
  })
  @IsOptional()
  @IsUUID()
  customerUserId?: string;

  @ApiPropertyOptional({ example: 'Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  guestName?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  guestPhone?: string;

  @ApiPropertyOptional({
    type: [OrderItemInputDto],
    description: 'Can start empty — add more rounds later',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items?: OrderItemInputDto[];

  @ApiPropertyOptional({ example: 'No onions' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class AddOrderItemsDto {
  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];
}

export class AssignTableDto {
  @ApiProperty({ example: 'b3f1c2a0-...' })
  @IsUUID()
  tableId: string;
}

export class SeatWaitlistEntryDto {
  @ApiProperty({ example: 'b3f1c2a0-...' })
  @IsUUID()
  tableId: string;

  @ApiPropertyOptional({
    description: 'Link to a real registered customer — never required',
  })
  @IsOptional()
  @IsUUID()
  customerUserId?: string;

  @ApiPropertyOptional({ example: 'Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  guestName?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  guestPhone?: string;

  @ApiPropertyOptional({ type: [OrderItemInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items?: OrderItemInputDto[];
}

const MARK_PAID_PAYMENT_METHODS = ['CASH', 'UPI'] as const;

export class MarkOrderPaidDto {
  @ApiPropertyOptional({
    enum: MARK_PAID_PAYMENT_METHODS,
    description:
      'DINE_IN/TAKEAWAY only — how the bill was actually settled, since that is often only known at checkout. Ignored for every other manually-created order, which already committed to a payment method at creation.',
  })
  @IsOptional()
  @IsIn(MARK_PAID_PAYMENT_METHODS)
  paymentMethod?: (typeof MARK_PAID_PAYMENT_METHODS)[number];
}
