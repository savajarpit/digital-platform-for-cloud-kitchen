import { Module } from '@nestjs/common';
import { AddonGroupsController } from './addon-groups.controller';
import { AddonGroupsService } from './addon-groups.service';
import { AddonGroupsRepository } from './addon-groups.repository';

@Module({
  controllers: [AddonGroupsController],
  providers: [AddonGroupsService, AddonGroupsRepository],
  exports: [AddonGroupsService],
})
export class AddonsModule {}
