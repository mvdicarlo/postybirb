import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { getDatabaseProvider } from './mikroorm.providers';
import { TypeormDatabaseProviders } from './typeorm.providers';

@Module({
  imports: [...getDatabaseProvider()],
  providers: [...TypeormDatabaseProviders],
  exports: [...TypeormDatabaseProviders, MikroOrmModule],
})
export class DatabaseModule {}
