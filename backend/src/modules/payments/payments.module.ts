import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WebhookEventsRepository } from './webhook-events.repository';
import { OrdersModule } from '../orders/orders.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import { RazorpayClientModule } from '../../shared-modules/razorpay/razorpay-client.module';

@Module({
  imports: [
    OrdersModule,
    SubscriptionsModule,
    RazorpayClientModule,
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    WebhookEventsRepository,
    PaymentReconciliationService,
  ],
})
export class PaymentsModule {}
