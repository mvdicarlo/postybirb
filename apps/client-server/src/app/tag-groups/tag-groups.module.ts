import { Module } from '@nestjs/common';
import { TagGroupEventListener } from './tag-group-event.listener';
import { TagGroupsController } from './tag-groups.controller';
import { TagGroupsService } from './tag-groups.service';

@Module({
  providers: [TagGroupsService, TagGroupEventListener],
  controllers: [TagGroupsController],
})
export class TagGroupsModule {}
