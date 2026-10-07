import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { Role } from '../../../common/enums/role.enum';

// `role` is redeclared without CreateUserDto's `= Role.CUSTOMER` default:
// PartialType copies property initializers, so inheriting it would silently
// demote anyone edited without an explicit role.
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['role'] as const),
) {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
