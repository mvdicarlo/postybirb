import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { getDatabaseProvider } from './mikro-orm.providers';
import { DatabaseUpdateSubscriber } from './subscribers/database.subscriber';

@Module({
  imports: [...getDatabaseProvider()],
  providers: [DatabaseUpdateSubscriber],
  exports: [MikroOrmModule, DatabaseUpdateSubscriber],
})
export class DatabaseModule {}
