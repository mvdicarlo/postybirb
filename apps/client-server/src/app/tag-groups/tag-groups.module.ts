import { Module } from '@nestjs/common';
import { TagGroupsService } from './tag-groups.service';
import { TagGroupsController } from './tag-groups.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [TagGroupsService],
  controllers: [TagGroupsController],
})
export class TagGroupsModule {}
