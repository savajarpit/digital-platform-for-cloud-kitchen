import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAddonGroupDto } from './create-addon-group.dto';

export class UpdateAddonGroupDto extends PartialType(CreateAddonGroupDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
