import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderFulfillmentType } from '../../../generated/prisma';
import { IsDateStr } from '../../../common/decorators/is-date-str.decorator';
import { KITCHEN_STAGES, type KitchenStage } from '../kitchen-rules';

const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' || value === true;

/** Shared by the order board and the prep summary. */
export class QueryKitchenDto {
  @ApiPropertyOptional({ example: '2026-10-03', description: 'Default: today' })
  @IsOptional()
  @IsDateStr()
  date?: string;

  @ApiPropertyOptional({ enum: ['ORDERS', 'PLAN'] })
  @IsOptional()
  @IsIn(['ORDERS', 'PLAN'])
  kind?: 'ORDERS' | 'PLAN';

  @ApiPropertyOptional({ description: 'A delivery slot id, or INSTANT' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  slot?: string;

  @ApiPropertyOptional({ enum: OrderFulfillmentType })
  @IsOptional()
  @IsEnum(OrderFulfillmentType)
  type?: OrderFulfillmentType;

  @ApiPropertyOptional({ enum: KITCHEN_STAGES })
  @IsOptional()
  @IsIn(KITCHEN_STAGES)
  stage?: KitchenStage;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasNotes?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasAddons?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ description: 'Only plan days the customer changed' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  changedOnly?: boolean;

  @ApiPropertyOptional({
    description:
      'Customer name, phone, email, address, item, add-on, note or order number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: ['time', 'placed'] })
  @IsOptional()
  @IsIn(['time', 'placed'])
  sort?: 'time' | 'placed';

  @ApiPropertyOptional({ description: 'Prep summary only: a menu category id' })
  @IsOptional()
  @IsUUID()
  category?: string;
}
