import { Module } from '@nestjs/common';
import { DrizzleService } from './drizzle.service';

@Module({
  controllers: [],
  providers: [DrizzleService],
  exports: [DrizzleService],
})
export class DrizzleModule {}
