import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('promotions')
@Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
@RequirePermission('promotions.manage')
@RequireFeature('promotions')
@ApiBearerAuth('access-token')
@Controller({ path: 'promotions', version: '1' })
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('coupons')
  @ResponseMessage('Coupons retrieved successfully')
  @ApiOperation({ summary: 'List all coupons for this tenant' })
  listCoupons(@CurrentTenantId() tenantId: string) {
    return this.promotionsService.findCoupons(tenantId);
  }

  @Post('coupons')
  @ResponseMessage('Coupon created successfully')
  @ApiOperation({ summary: 'Create a coupon' })
  createCoupon(
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateCouponDto,
  ) {
    return this.promotionsService.createCoupon(tenantId, dto);
  }

  @Patch('coupons/:id')
  @ResponseMessage('Coupon updated successfully')
  @ApiOperation({ summary: 'Update a coupon' })
  updateCoupon(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.promotionsService.updateCoupon(tenantId, id, dto);
  }

  @Delete('coupons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a coupon' })
  async deleteCoupon(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.promotionsService.deleteCoupon(tenantId, id);
  }

  @Get()
  @ResponseMessage('Promotions retrieved successfully')
  @ApiOperation({ summary: 'List all promotions for this tenant' })
  listPromotions(@CurrentTenantId() tenantId: string) {
    return this.promotionsService.findPromotions(tenantId);
  }

  @Post()
  @ResponseMessage('Promotion created successfully')
  @ApiOperation({
    summary: 'Create a promotion (BOGO / free-item / scheduled discount)',
  })
  createPromotion(
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreatePromotionDto,
  ) {
    return this.promotionsService.createPromotion(tenantId, dto);
  }

  @Patch(':id')
  @ResponseMessage('Promotion updated successfully')
  @ApiOperation({ summary: 'Update a promotion' })
  updatePromotion(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionsService.updatePromotion(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a promotion' })
  async deletePromotion(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.promotionsService.deletePromotion(tenantId, id);
  }
}
