import { Global, Module } from '@nestjs/common';
import { Database } from './database.service';

@Global()
@Module({
  providers: [Database],
  exports: [Database],
})
export class DrizzleModule {}
