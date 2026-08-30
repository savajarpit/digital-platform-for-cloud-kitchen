import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SubscriptionsMaterializationScheduler } from './subscriptions-materialization.scheduler';
import { SubscriptionMaterializationService } from './subscription-materialization.service';
import { SubscriptionDisruptionService } from './subscription-disruption.service';
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
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionsRepository,
    SubscriptionsMaterializationScheduler,
    SubscriptionMaterializationService,
    SubscriptionDisruptionService,
    PaginationService,
  ],
  exports: [SubscriptionsService, SubscriptionsRepository],
})
export class SubscriptionsModule {}
