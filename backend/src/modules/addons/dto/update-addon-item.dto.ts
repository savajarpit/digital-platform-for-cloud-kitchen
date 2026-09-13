import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAddonItemDto } from './create-addon-item.dto';

export class UpdateAddonItemDto extends PartialType(
  OmitType(CreateAddonItemDto, ['addonGroupId'] as const),
) {}
