import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { AddressesModule } from '../addresses/addresses.module';
import { MenuModule } from '../menu/menu.module';
import { SettingsModule } from '../settings/settings.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { UsersModule } from '../users/users.module';
import { RazorpayClientModule } from '../../shared-modules/razorpay/razorpay-client.module';
import { PaginationService } from '../../common/services/pagination.service';
import { TenantLimitsModule } from '../tenant-limits/tenant-limits.module';
import { FeaturesModule } from '../features/features.module';
import { RefundsModule } from '../../shared-modules/refunds/refunds.module';
import { DineInModule } from '../dine-in/dine-in.module';
import { AddonsModule } from '../addons/addons.module';

@Module({
  imports: [
    AddressesModule,
    MenuModule,
    SettingsModule,
    PromotionsModule,
    UsersModule,
    RazorpayClientModule,
    TenantLimitsModule,
    FeaturesModule,
    RefundsModule,
    DineInModule,
    AddonsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, PaginationService],
  exports: [OrdersRepository, OrdersService],
})
export class OrdersModule {}
