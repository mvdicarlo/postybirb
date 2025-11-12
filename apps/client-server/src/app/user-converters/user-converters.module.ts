import { Module } from '@nestjs/common';
import { UserConvertersController } from './user-converters.controller';
import { UserConvertersService } from './user-converters.service';

@Module({
  controllers: [UserConvertersController],
  providers: [UserConvertersService],
  exports: [UserConvertersService],
})
export class UserConvertersModule {}
