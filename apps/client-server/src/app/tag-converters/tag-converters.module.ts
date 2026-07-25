import { Module } from '@nestjs/common';
import { TagConvertersController } from './tag-converters.controller';
import { TagConvertersService } from './tag-converters.service';

@Module({
  controllers: [TagConvertersController],
  providers: [TagConvertersService],
  exports: [TagConvertersService],
})
export class TagConvertersModule {}
