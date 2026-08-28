import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformCancellationRequestsService } from './platform-cancellation-requests.service';
import { CreateCancellationRequestDto } from './dto/create-cancellation-request.dto';
import { UpdateCancellationRequestStatusDto } from './dto/update-cancellation-request-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('platform-cancellation-requests')
@Controller({ path: 'platform-cancellation-requests', version: '1' })
export class PlatformCancellationRequestsController {
  constructor(
    private readonly requestsService: PlatformCancellationRequestsService,
  ) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @ApiBearerAuth('access-token')
  @ResponseMessage("Thanks — we'll be in touch shortly")
  @ApiOperation({
    summary:
      "Tenant: request cancellation of the platform subscription — never cancels anything itself, just notifies Arpit to follow up. The trigger for this is currently hidden in the admin UI; the endpoint works once enabled.",
  })
  create(
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateCancellationRequestDto,
  ) {
    return this.requestsService.create(tenantId, dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Cancellation requests retrieved successfully')
  @ApiOperation({
    summary: 'SUPER_ADMIN-only: every cancellation request, newest first',
  })
  list() {
    return this.requestsService.listRequests();
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Cancellation request updated successfully')
  @ApiOperation({
    summary: 'SUPER_ADMIN-only: mark a request contacted/resolved',
  })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCancellationRequestStatusDto,
  ) {
    return this.requestsService.updateStatus(id, dto);
  }
}
