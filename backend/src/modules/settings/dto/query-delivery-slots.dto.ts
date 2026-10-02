import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const SLOT_FLOW_QUERY_VALUES = ['orders', 'subscriptions'] as const;

export class QueryDeliverySlotsDto {
  @ApiPropertyOptional({
    enum: SLOT_FLOW_QUERY_VALUES,
    default: 'orders',
    description:
      'Which flow the slots are for — "subscriptions" for the plan purchase / manual subscription pickers.',
  })
  @IsOptional()
  @IsIn(SLOT_FLOW_QUERY_VALUES, {
    message: 'for must be "orders" or "subscriptions".',
  })
  for?: (typeof SLOT_FLOW_QUERY_VALUES)[number];
}
