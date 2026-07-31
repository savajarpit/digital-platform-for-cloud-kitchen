import { Module } from '@nestjs/common';
import { PlatformPagesController } from './platform-pages.controller';
import { PlatformPagesService } from './platform-pages.service';
import { PlatformPagesRepository } from './platform-pages.repository';

@Module({
  controllers: [PlatformPagesController],
  providers: [PlatformPagesService, PlatformPagesRepository],
  exports: [PlatformPagesService],
})
export class PlatformPagesModule {}
