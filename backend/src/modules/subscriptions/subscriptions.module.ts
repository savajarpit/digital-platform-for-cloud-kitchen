import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SubscriptionsMaterializationScheduler } from './subscriptions-materialization.scheduler';
import { AddressesModule } from '../addresses/addresses.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { SettingsModule } from '../settings/settings.module';
import { FeaturesModule } from '../features/features.module';
import { RazorpayClientModule } from '../../shared-modules/razorpay/razorpay-client.module';
import { PaginationService } from '../../common/services/pagination.service';
import { TenantLimitsModule } from '../tenant-limits/tenant-limits.module';

@Module({
  imports: [
    AddressesModule,
    PromotionsModule,
    SettingsModule,
    FeaturesModule,
    RazorpayClientModule,
    TenantLimitsModule,
  ],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionsRepository,
    SubscriptionsMaterializationScheduler,
    PaginationService,
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
