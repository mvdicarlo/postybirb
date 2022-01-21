import { Provider } from '@nestjs/common';
import { PostyBirbDirectories } from '@postybirb/fs';
import { existsSync } from 'fs';
import { join } from 'path';
import { Class } from 'type-fest';
import { createConnection } from 'typeorm';
import { DATABASE_CONNECTION } from '../constants';
import { entities } from './entities';
import { Migrations } from './migrations';

// Only need to run a synchronize on first initialization.
// Any schema changes afterwards should be handled by migrations.
const DATABASE_PATH = join(PostyBirbDirectories.DATA_DIRECTORY, 'database.db');
const exists = existsSync(DATABASE_PATH);

/*
 * TypeORM Database Provider
 * https://docs.nestjs.com/recipes/sql-typeorm
 */
export const TypeormDatabaseProviders: Provider[] = [
  {
    provide: DATABASE_CONNECTION,
    useFactory: async () =>
      createConnection({
        type: 'sqlite',
        database: DATABASE_PATH,
        synchronize: true, //! exists,
        entities,
        migrations: [...Migrations],
        migrationsRun: true,
      }),
  },
];

export function getTestDatabaseProvider(entityModels: Class[]): Provider {
  return {
    provide: DATABASE_CONNECTION,
    useFactory: async () =>
      createConnection({
        type: 'sqlite',
        database: ':memory:',
        dropSchema: true,
        synchronize: true,
        logging: false,
        entities: entityModels,
        name: DATABASE_CONNECTION,
      }),
  };
}
