import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { PaginationService } from '../../common/services/pagination.service';
import { HashUtil } from '../../common/utils/hash.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { OffsetPaginationDto } from '../../common/dto/pagination.dto';
import { User } from '../../generated/prisma';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly pagination: PaginationService,
  ) {}

  async create(dto: CreateUserDto, tenantId: string): Promise<User> {
    const exists = await this.usersRepo.findByEmail(dto.email);
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await HashUtil.hash(dto.password);
    return this.usersRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      tenant: { connect: { id: tenantId } },
    });
  }

  async findAll(dto: OffsetPaginationDto, tenantId: string) {
    const skip = this.pagination.getOffsetSkip(dto.page, dto.limit);
    const [data, total] = await this.usersRepo.findAll(
      tenantId,
      skip,
      dto.limit,
    );
    return {
      data,
      meta: this.pagination.buildOffsetMeta(total, dto.page, dto.limit),
    };
  }

  async findCustomers(dto: QueryCustomersDto, tenantId: string) {
    const skip = this.pagination.getOffsetSkip(dto.page, dto.limit);
    const [data, total] = await this.usersRepo.findCustomers(
      tenantId,
      skip,
      dto.limit,
      dto.search,
    );
    return {
      data,
      meta: this.pagination.buildOffsetMeta(total, dto.page, dto.limit),
    };
  }

  async findOne(id: string, tenantId: string): Promise<User> {
    const user = await this.usersRepo.findById(id, tenantId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findCustomerDetail(id: string, tenantId: string) {
    const customer = await this.usersRepo.findCustomerDetail(tenantId, id);
    if (!customer) throw new NotFoundException('Customer not found');
    // Manual strip, not a DTO — nested addresses/orders/subscriptions vary in
    // shape per include, so a class-transformer allow-list would just
    // duplicate this same list of fields to drop.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...safe } = customer;
    return safe;
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateUserDto,
  ): Promise<User> {
    await this.findOne(id, tenantId);
    if (dto.password) {
      dto.password = await HashUtil.hash(dto.password);
    }
    return this.usersRepo.update(id, dto);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.usersRepo.softDelete(id);
  }

  async updateOwnProfile(
    userId: string,
    tenantId: string,
    dto: UpdateProfileDto,
  ): Promise<User> {
    await this.findOne(userId, tenantId);
    return this.usersRepo.updateProfile(userId, dto);
  }

  async changePassword(
    userId: string,
    tenantId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.findOne(userId, tenantId);
    const matches = await HashUtil.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!matches) {
      throw new BadRequestException('Current password is incorrect');
    }
    const passwordHash = await HashUtil.hash(dto.newPassword);
    await this.usersRepo.updatePassword(userId, passwordHash);
  }
}
