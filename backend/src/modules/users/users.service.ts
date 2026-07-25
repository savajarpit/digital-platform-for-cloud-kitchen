import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { PaginationService } from '../../common/services/pagination.service';
import { HashUtil } from '../../common/utils/hash.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.findOne(id);
    if (dto.password) {
      dto.password = await HashUtil.hash(dto.password);
    }
    return this.usersRepo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.usersRepo.softDelete(id);
  }
}
