import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { PaginationService } from '../../common/services/pagination.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, PaginationService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
