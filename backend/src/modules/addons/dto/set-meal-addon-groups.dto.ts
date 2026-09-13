import { ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Replaces the full set of groups attached to a meal in one call — matches
 * a multi-select checkbox list in the admin meal editor, not incremental
 * attach/detach calls that could drift from the UI's own state. */
export class SetMealAddonGroupsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  addonGroupIds: string[];
}
