import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminCustomersService } from './admin-customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { CreateAddressDto } from '../addresses/dto/create-address.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

/** Write side of admin customer management; the read side (list/detail,
 * `customers.view`) stays on UsersController. POST-only, so these routes
 * never compete with UsersController's GET `:id` wildcard. */
@ApiTags('users')
@ApiBearerAuth('access-token')
@Roles(Role.SUPER_ADMIN, Role.OWNER, Role.STAFF)
@RequirePermission('customers.manage')
@Controller({ path: 'users/customers', version: '1' })
export class AdminCustomersController {
  constructor(private readonly adminCustomers: AdminCustomersService) {}

  @Post()
  @ResponseMessage('Customer created')
  @ApiOperation({
    summary:
      'Admin: create a customer (optionally with a first address) and email them a set-password invite',
  })
  @ApiConflictResponse({ description: 'Email already in use in this tenant' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    const { customer, address } = await this.adminCustomers.createCustomer(
      tenantId,
      dto,
    );
    return {
      customer: new CustomerResponseDto({ ...customer, _count: { orders: 0 } }),
      address,
    };
  }

  @Post(':id/invite')
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { limit: 20, ttl: 3_600_000 } })
  @ResponseMessage('Invite sent')
  @ApiOperation({
    summary: 'Admin: resend the set-password invite (revokes the old link)',
  })
  async resendInvite(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.adminCustomers.resendInvite(tenantId, id);
    return null;
  }

  @Post(':id/addresses')
  @ResponseMessage('Address added')
  @ApiOperation({ summary: "Admin: add an address to a customer's account" })
  addAddress(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.adminCustomers.addAddress(tenantId, id, dto);
  }
}
