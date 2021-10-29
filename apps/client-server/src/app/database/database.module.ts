import { Module } from '@nestjs/common';
import { TypeormDatabaseProviders } from './typeorm.providers';

@Module({
  providers: [...TypeormDatabaseProviders],
  exports: [...TypeormDatabaseProviders],
})
export class DatabaseModule {}
