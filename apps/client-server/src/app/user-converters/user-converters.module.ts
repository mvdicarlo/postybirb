import { Module } from '@nestjs/common';
import { UserConverterEventListener } from './user-converter-event.listener';
import { UserConvertersController } from './user-converters.controller';
import { UserConvertersService } from './user-converters.service';

@Module({
  controllers: [UserConvertersController],
  providers: [UserConvertersService, UserConverterEventListener],
  exports: [UserConvertersService],
})
export class UserConvertersModule {}
