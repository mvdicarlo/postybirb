import { Module } from '@nestjs/common';
import { typeormDatabaseProviders } from './typeorm.providers';

@Module({
  providers: [...typeormDatabaseProviders],
})
export class DatabaseModule {}
