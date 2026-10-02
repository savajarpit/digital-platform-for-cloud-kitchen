import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CancellationNotifier } from './cancellation-notifier.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'mail' })],
  providers: [CancellationNotifier],
  exports: [CancellationNotifier],
})
export class CancellationNotificationsModule {}
