import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { AddressesModule } from '../addresses/addresses.module';
import { MenuModule } from '../menu/menu.module';
import { SettingsModule } from '../settings/settings.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { RazorpayClientModule } from '../../shared-modules/razorpay/razorpay-client.module';
import { PaginationService } from '../../common/services/pagination.service';

@Module({
  imports: [
    AddressesModule,
    MenuModule,
    SettingsModule,
    PromotionsModule,
    RazorpayClientModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, PaginationService],
  exports: [OrdersRepository, OrdersService],
})
export class OrdersModule {}
