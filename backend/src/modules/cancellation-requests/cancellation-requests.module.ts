import { Module } from '@nestjs/common';
import { CancellationRequestsController } from './cancellation-requests.controller';
import { CancellationRequestsService } from './cancellation-requests.service';
import { CancellationRequestsRepository } from './cancellation-requests.repository';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { FeaturesModule } from '../features/features.module';
import { CancellationNotificationsModule } from '../../shared-modules/cancellation-notifications/cancellation-notifications.module';
import { PaginationService } from '../../common/services/pagination.service';

@Module({
  imports: [
    SubscriptionsModule,
    FeaturesModule,
    CancellationNotificationsModule,
  ],
  controllers: [CancellationRequestsController],
  providers: [
    CancellationRequestsService,
    CancellationRequestsRepository,
    PaginationService,
  ],
})
export class CancellationRequestsModule {}
