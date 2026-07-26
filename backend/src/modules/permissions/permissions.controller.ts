import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { PermissionsRepository } from './permissions.repository';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';
import { SetGrantDto } from './dto/set-grant.dto';

@ApiTags('permissions')
@ApiBearerAuth('access-token')
@Controller({ path: 'permissions', version: '1' })
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly permissionsRepo: PermissionsRepository,
  ) {}

  @Get('me')
  @ResponseMessage('Permissions retrieved successfully')
  @ApiOperation({
    summary: "Get the current user's role and granted permissions",
  })
  getMyPermissions(
    @CurrentUser('role') role: Role,
    @CurrentUser('tenantId') tenantId: string | undefined,
  ) {
    return this.permissionsService.getMyPermissions(role, tenantId);
  }

  @Get('catalog')
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  @ResponseMessage('Permission catalog retrieved successfully')
  @ApiOperation({ summary: 'List every permission that exists in the system' })
  getCatalog() {
    return this.permissionsRepo.findAllPermissions();
  }

  @Get('tenants/:tenantId/roles/:role')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('Role permissions retrieved successfully')
  @ApiOperation({
    summary: "SUPER_ADMIN-only: view a tenant role's full grant state",
  })
  getRoleGrants(
    @Param('tenantId') tenantId: string,
    @Param('role', new ParseEnumPipe(Role)) role: Role,
  ) {
    return this.permissionsService.getRoleGrantView(tenantId, role);
  }

  @Put('tenants/:tenantId/roles/:role/:permissionKey')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('Permission grant updated successfully')
  @ApiOperation({
    summary:
      'SUPER_ADMIN-only: grant or revoke one permission for a tenant role',
  })
  setGrant(
    @Param('tenantId') tenantId: string,
    @Param('role', new ParseEnumPipe(Role)) role: Role,
    @Param('permissionKey') permissionKey: string,
    @Body() dto: SetGrantDto,
  ) {
    return this.permissionsService.setGrant(
      tenantId,
      role,
      permissionKey,
      dto.granted,
    );
  }
}
