import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PlatformBillingController } from './platform-billing.controller';
import { PlatformBillingService } from './platform-billing.service';
import { PlatformBillingRepository } from './platform-billing.repository';
import { RazorpayClientModule } from '../../shared-modules/razorpay/razorpay-client.module';

@Module({
  imports: [RazorpayClientModule, BullModule.registerQueue({ name: 'mail' })],
  controllers: [PlatformBillingController],
  providers: [PlatformBillingService, PlatformBillingRepository],
  exports: [PlatformBillingService],
})
export class PlatformBillingModule {}
