import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PlatformLeadsController } from './platform-leads.controller';
import { PlatformLeadsService } from './platform-leads.service';
import { PlatformLeadsRepository } from './platform-leads.repository';

@Module({
  imports: [BullModule.registerQueue({ name: 'mail' })],
  controllers: [PlatformLeadsController],
  providers: [PlatformLeadsService, PlatformLeadsRepository],
})
export class PlatformLeadsModule {}
