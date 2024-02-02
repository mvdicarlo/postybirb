import { Module } from '@nestjs/common';
import { UpdateController } from './update.controller';
import { UpdateService } from './update.service';

@Module({
  providers: [UpdateService],
  controllers: [UpdateController],
})
export class UpdateModule {}
