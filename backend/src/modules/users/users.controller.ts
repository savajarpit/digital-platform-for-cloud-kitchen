import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { OffsetPaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('users')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  @RequirePermission('staff.manage')
  @ResponseMessage('User created successfully')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiConflictResponse({ description: 'Email already in use' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return new UserResponseDto(await this.usersService.create(dto, tenantId));
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiPaginatedResponse(UserResponseDto)
  async findAll(
    @Query() pagination: OffsetPaginationDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const { data, meta } = await this.usersService.findAll(
      pagination,
      tenantId,
    );
    return { data: data.map((user) => new UserResponseDto(user)), meta };
  }

  @Get('me')
  @ResponseMessage('Profile retrieved')
  @ApiOperation({ summary: 'Get the current user’s own profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getOwnProfile(
    @CurrentUser('userId') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return new UserResponseDto(
      await this.usersService.findOne(userId, tenantId),
    );
  }

  @Patch('me')
  @ResponseMessage('Profile updated')
  @ApiOperation({
    summary: 'Update the current user’s own profile (name/phone only)',
  })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateOwnProfile(
    @CurrentUser('userId') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return new UserResponseDto(
      await this.usersService.updateOwnProfile(userId, tenantId, dto),
    );
  }

  @Patch('me/password')
  @ResponseMessage('Password changed successfully')
  @ApiOperation({ summary: "Change the current user's own password" })
  @ApiBadRequestResponse({ description: 'Current password is incorrect' })
  async changeOwnPassword(
    @CurrentUser('userId') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(userId, tenantId, dto);
    return null;
  }

  // Must come before @Get(':id') — otherwise "customers" would be parsed as a user id.
  @Get('customers')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('customers.view')
  @ApiOperation({
    summary: "List this tenant's customers (paginated, searchable)",
  })
  async findCustomers(
    @Query() query: QueryCustomersDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const { data, meta } = await this.usersService.findCustomers(
      query,
      tenantId,
    );
    return { data: data.map((c) => new CustomerResponseDto(c)), meta };
  }

  // Must come after 'customers' above — otherwise this `:id` wildcard's
  // 1-segment sibling wouldn't matter, but keep it grouped with its list.
  @Get('customers/:id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
  @RequirePermission('customers.view')
  @ApiOperation({
    summary:
      "Admin: a customer's full detail — profile, addresses, recent orders, subscriptions",
  })
  findCustomerDetail(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.findCustomerDetail(id, tenantId);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return new UserResponseDto(await this.usersService.findOne(id, tenantId));
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return new UserResponseDto(
      await this.usersService.update(id, tenantId, dto),
    );
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  @RequirePermission('staff.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete user' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.usersService.remove(id, tenantId);
  }
}
