import { Module } from '@nestjs/common';
import { SocialLinksController } from './social-links.controller';
import { SocialLinksService } from './social-links.service';
import { SocialLinksRepository } from './social-links.repository';

@Module({
  controllers: [SocialLinksController],
  providers: [SocialLinksService, SocialLinksRepository],
})
export class SocialLinksModule {}
