import { PartialType, OmitType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateDiningTableDto } from './create-dining-table.dto';

export class UpdateDiningTableDto extends PartialType(
  OmitType(CreateDiningTableDto, ['kitchenZoneId'] as const),
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
