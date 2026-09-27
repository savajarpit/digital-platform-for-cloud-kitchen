import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CustomerInviteService } from './customer-invite.service';
import { AddressesService } from '../addresses/addresses.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateAddressDto } from '../addresses/dto/create-address.dto';
import { HashUtil } from '../../common/utils/hash.util';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { Address, Role, User } from '../../generated/prisma';

/** Staff-side customer management for phone-in orders/subscriptions. */
@Injectable()
export class AdminCustomersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly addressesService: AddressesService,
    private readonly invites: CustomerInviteService,
  ) {}

  async createCustomer(
    tenantId: string,
    dto: CreateCustomerDto,
  ): Promise<{ customer: User; address: Address | null }> {
    const existing = await this.usersRepo.findByEmail(dto.email, tenantId);
    if (existing) {
      throw new ConflictException(
        'A customer with this email already exists — search for them instead.',
      );
    }

    // Nobody knows this password — the account is unusable until the
    // customer sets their own through the invite (or forgot-password).
    const passwordHash = await HashUtil.hash(CryptoUtil.generateToken(32));
    const customer = await this.usersRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: Role.CUSTOMER,
      // The admin vouches for this person; the invite link proves the email.
      verifiedAt: new Date(),
      tenant: { connect: { id: tenantId } },
    });

    const address = dto.address
      ? await this.addressesService.createOnBehalf(tenantId, customer.id, {
          ...dto.address,
          isDefault: true,
        })
      : null;

    if (dto.sendInvite ?? true) await this.invites.sendInvite(customer);
    return { customer, address };
  }

  async resendInvite(tenantId: string, customerId: string): Promise<void> {
    const customer = await this.findCustomer(tenantId, customerId);
    await this.invites.sendInvite(customer);
  }

  async addAddress(
    tenantId: string,
    customerId: string,
    dto: CreateAddressDto,
  ): Promise<Address> {
    const customer = await this.findCustomer(tenantId, customerId);
    if (!customer.isActive) {
      throw new BadRequestException('This customer account is deactivated.');
    }
    return this.addressesService.createOnBehalf(tenantId, customer.id, dto);
  }

  invitePending(customerId: string): Promise<boolean> {
    return this.invites.isPending(customerId);
  }

  private async findCustomer(tenantId: string, id: string): Promise<User> {
    const customer = await this.usersRepo.findCustomerById(tenantId, id);
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
}
