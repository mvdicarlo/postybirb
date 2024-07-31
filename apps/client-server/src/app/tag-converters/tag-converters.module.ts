import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TagConvertersController } from './tag-converters.controller';
import { TagConvertersService } from './tag-converters.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TagConvertersController],
  providers: [TagConvertersService],
  exports: [TagConvertersService],
})
export class TagConvertersModule {}
