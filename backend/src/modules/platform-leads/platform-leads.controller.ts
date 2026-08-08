import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformLeadsService } from './platform-leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('platform-leads')
@Controller({ path: 'platform-leads', version: '1' })
export class PlatformLeadsController {
  constructor(private readonly platformLeadsService: PlatformLeadsService) {}

  @Public()
  @Post()
  @ResponseMessage("Thanks — we'll be in touch shortly")
  @ApiOperation({
    summary:
      'Public: submit a "contact us" lead from the marketing site — never creates a tenant or triggers payment, purely a manual-review queue',
  })
  create(@Body() dto: CreateLeadDto) {
    return this.platformLeadsService.createLead(dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Leads retrieved successfully')
  @ApiOperation({ summary: 'SUPER_ADMIN-only: every lead, newest first' })
  list() {
    return this.platformLeadsService.listLeads();
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ResponseMessage('Lead updated successfully')
  @ApiOperation({
    summary: 'SUPER_ADMIN-only: mark a lead contacted/converted/dismissed',
  })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.platformLeadsService.updateStatus(id, dto);
  }
}
