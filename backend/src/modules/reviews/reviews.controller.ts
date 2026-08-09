import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { UpsertReviewDto } from './dto/upsert-review.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.OWNER, Role.STAFF] as const;

@ApiTags('reviews')
@Controller({ path: 'reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Public()
  @Get()
  @ResponseMessage('Reviews retrieved successfully')
  @ApiOperation({ summary: 'Public: published testimonials for the home page' })
  findPublished(@CurrentTenant('id') tenantId: string | undefined) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.service.findPublished(tenantId);
  }

  @Get('admin')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.content.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Reviews retrieved successfully')
  @ApiOperation({ summary: 'Admin: every review, published or not' })
  findAllForAdmin(@CurrentTenantId() tenantId: string) {
    return this.service.findAllForAdmin(tenantId);
  }

  @Post()
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.content.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Review added successfully')
  @ApiOperation({ summary: 'Admin: add a testimonial' })
  create(@CurrentTenantId() tenantId: string, @Body() dto: UpsertReviewDto) {
    return this.service.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.content.edit')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Review updated successfully')
  @ApiOperation({ summary: 'Admin: edit/publish/unpublish a testimonial' })
  update(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpsertReviewDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  @RequirePermission('settings.content.edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: delete a testimonial' })
  async delete(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    await this.service.delete(tenantId, id);
  }
}
