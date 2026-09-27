import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { UsersController } from './users.controller';
import { AdminCustomersController } from './admin-customers.controller';
import { UsersService } from './users.service';
import { AdminCustomersService } from './admin-customers.service';
import { CustomerInviteService } from './customer-invite.service';
import { UsersRepository } from './users.repository';
import { AddressesModule } from '../addresses/addresses.module';
import { PaginationService } from '../../common/services/pagination.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'mail' }), AddressesModule],
  controllers: [UsersController, AdminCustomersController],
  providers: [
    UsersService,
    AdminCustomersService,
    CustomerInviteService,
    UsersRepository,
    PaginationService,
  ],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
