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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MealsService } from './meals.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { QueryMealsDto } from './dto/query-meals.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('menu')
@Controller({ path: 'menu/meals', version: '1' })
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Public()
  @Get()
  @ResponseMessage('Meals retrieved successfully')
  @ApiOperation({ summary: 'List available meals for the storefront' })
  findAll(
    @CurrentTenant('id') tenantId: string | undefined,
    @Query() query: QueryMealsDto,
  ) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.mealsService.findAll(tenantId, query, true);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @Get('admin')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Meals retrieved successfully')
  @ApiOperation({ summary: 'List all meals (including unavailable) for admin' })
  findAllForAdmin(
    @CurrentTenantId() tenantId: string,
    @Query() query: QueryMealsDto,
  ) {
    return this.mealsService.findAll(tenantId, query, false);
  }

  @Public()
  @Get(':id')
  @ResponseMessage('Meal retrieved successfully')
  @ApiOperation({ summary: 'Get a single meal' })
  findOne(
    @CurrentTenant('id') tenantId: string | undefined,
    @Param('id') id: string,
  ) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.mealsService.findOne(tenantId, id);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @Post()
  @ApiBearerAuth('access-token')
  @ResponseMessage('Meal created successfully')
  @ApiOperation({ summary: 'Create a meal' })
  create(@CurrentTenantId() tenantId: string, @Body() dto: CreateMealDto) {
    return this.mealsService.create(tenantId, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Meal updated successfully')
  @ApiOperation({ summary: 'Update a meal' })
  update(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMealDto,
  ) {
    return this.mealsService.update(tenantId, id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a meal' })
  async remove(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    await this.mealsService.remove(tenantId, id);
  }
}
