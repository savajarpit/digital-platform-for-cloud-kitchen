import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PlatformTermsService } from './platform-terms.service';
import { CreatePlatformTermsDto } from './dto/create-platform-terms.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { SkipPlatformTerms } from '../../common/decorators/skip-platform-terms.decorator';
import { Role } from '../../common/enums/role.enum';

const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.OWNER, Role.STAFF] as const;

@ApiTags('platform-terms')
@ApiBearerAuth('access-token')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'platform-terms', version: '1' })
export class PlatformTermsController {
  constructor(private readonly platformTermsService: PlatformTermsService) {}

  @Get('latest')
  @SkipPlatformTerms()
  @ResponseMessage('Latest platform terms retrieved successfully')
  @ApiOperation({ summary: 'Get the current published platform terms' })
  getLatest() {
    return this.platformTermsService.getLatest();
  }

  @Get('me')
  @SkipPlatformTerms()
  @ResponseMessage('Platform terms status retrieved successfully')
  @ApiOperation({ summary: "Get the current user's acceptance status" })
  getMyStatus(
    @CurrentUser('userId') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.platformTermsService.getMyStatus(tenantId, userId);
  }

  @Post('accept')
  @SkipPlatformTerms()
  @ResponseMessage('Platform terms accepted')
  @ApiOperation({ summary: 'Accept the current published platform terms' })
  accept(
    @CurrentUser('userId') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Req() req: Request,
  ) {
    return this.platformTermsService.accept(tenantId, userId, req.ip ?? null);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('Platform terms history retrieved successfully')
  @ApiOperation({ summary: 'SUPER_ADMIN-only: list every published version' })
  listAll() {
    return this.platformTermsService.listAll();
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('Platform terms published successfully')
  @ApiOperation({ summary: 'SUPER_ADMIN-only: publish a new terms version' })
  publish(@Body() dto: CreatePlatformTermsDto) {
    return this.platformTermsService.publish(dto);
  }
}
