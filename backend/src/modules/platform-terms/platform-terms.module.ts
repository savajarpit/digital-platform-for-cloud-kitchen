import { Module } from '@nestjs/common';
import { PlatformTermsController } from './platform-terms.controller';
import { PlatformTermsService } from './platform-terms.service';
import { PlatformTermsRepository } from './platform-terms.repository';

@Module({
  controllers: [PlatformTermsController],
  providers: [PlatformTermsService, PlatformTermsRepository],
  exports: [PlatformTermsService],
})
export class PlatformTermsModule {}
