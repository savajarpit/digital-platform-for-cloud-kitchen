import { Module } from '@nestjs/common';
import { DiningTablesController } from './dining-tables.controller';
import { DiningTablesService } from './dining-tables.service';
import { DiningTablesRepository } from './dining-tables.repository';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';
import { WaitlistRepository } from './waitlist.repository';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [DiningTablesController, WaitlistController],
  providers: [
    DiningTablesService,
    DiningTablesRepository,
    WaitlistService,
    WaitlistRepository,
  ],
  exports: [DiningTablesService, WaitlistService],
})
export class DineInModule {}
