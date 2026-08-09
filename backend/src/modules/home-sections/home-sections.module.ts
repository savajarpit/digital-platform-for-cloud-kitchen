import { Module } from '@nestjs/common';
import { HomeSectionsController } from './home-sections.controller';
import { HomeSectionsService } from './home-sections.service';
import { HomeSectionsRepository } from './home-sections.repository';

@Module({
  controllers: [HomeSectionsController],
  providers: [HomeSectionsService, HomeSectionsRepository],
})
export class HomeSectionsModule {}
