import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PlatformCancellationRequestsController } from './platform-cancellation-requests.controller';
import { PlatformCancellationRequestsService } from './platform-cancellation-requests.service';
import { PlatformCancellationRequestsRepository } from './platform-cancellation-requests.repository';

@Module({
  imports: [BullModule.registerQueue({ name: 'mail' })],
  controllers: [PlatformCancellationRequestsController],
  providers: [
    PlatformCancellationRequestsService,
    PlatformCancellationRequestsRepository,
  ],
})
export class PlatformCancellationRequestsModule {}
