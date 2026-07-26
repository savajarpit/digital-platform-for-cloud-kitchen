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
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@ApiTags('addresses')
@Controller({ path: 'addresses', version: '1' })
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Public()
  @Get('check-serviceability')
  @ResponseMessage('Serviceability checked')
  @ApiOperation({ summary: 'Check whether a pincode is currently serviceable' })
  checkServiceability(
    @CurrentTenant('id') tenantId: string | undefined,
    @Query('pincode') pincode: string,
  ) {
    if (!tenantId)
      throw new NotFoundException('No tenant context for this request');
    return this.addressesService.checkServiceability(tenantId, pincode);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ResponseMessage('Addresses retrieved successfully')
  @ApiOperation({ summary: "List the current user's saved addresses" })
  findAll(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.addressesService.findAll(tenantId, userId);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ResponseMessage('Address created successfully')
  @ApiOperation({ summary: 'Add a new delivery address' })
  create(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.create(tenantId, userId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Address updated successfully')
  @ApiOperation({ summary: 'Update a saved address' })
  update(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(tenantId, userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a saved address' })
  async remove(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    await this.addressesService.remove(tenantId, userId, id);
  }
}
