import { Module } from '@nestjs/common';
import { TagConverterEventListener } from './tag-converter-event.listener';
import { TagConvertersController } from './tag-converters.controller';
import { TagConvertersService } from './tag-converters.service';

@Module({
  controllers: [TagConvertersController],
  providers: [TagConvertersService, TagConverterEventListener],
  exports: [TagConvertersService],
})
export class TagConvertersModule {}
