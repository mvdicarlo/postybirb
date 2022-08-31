import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { getDatabaseProvider } from './mikroorm.providers';

@Module({
  imports: [...getDatabaseProvider()],
  exports: [MikroOrmModule],
})
export class DatabaseModule {}
