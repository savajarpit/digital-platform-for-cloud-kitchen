import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { KITCHEN_TARGETS, type KitchenTarget } from '../kitchen-rules';

export class UpdateKitchenStatusDto {
  @ApiProperty({
    enum: KITCHEN_TARGETS,
    description:
      'PREPARING = Start (or undo Mark ready); READY = Mark ready. Dispatch stays on the Orders page.',
  })
  @IsIn(KITCHEN_TARGETS)
  status: KitchenTarget;
}
