import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { AddressesModule } from '../addresses/addresses.module';
import { MenuModule } from '../menu/menu.module';
import { SettingsModule } from '../settings/settings.module';
import { RazorpayClientModule } from '../../shared-modules/razorpay/razorpay-client.module';

@Module({
  imports: [AddressesModule, MenuModule, SettingsModule, RazorpayClientModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersRepository, OrdersService],
})
export class OrdersModule {}
