import { Module } from '@nestjs/common';
import { TagGroupsController } from './tag-groups.controller';
import { TagGroupsService } from './tag-groups.service';

@Module({
  providers: [TagGroupsService],
  controllers: [TagGroupsController],
})
export class TagGroupsModule {}
