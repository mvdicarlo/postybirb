import { Provider } from '@nestjs/common';
import { createConnection } from 'typeorm';
import { PostyBirbDirectories } from '@postybirb/fs';
import { join } from 'path';
import { existsSync } from 'fs';
import { DATABASE_CONNECTION } from '../constants';
import { entities } from './entities';

// Only need to run a synchronize on first initialization.
// Any schema changes afterwards should be handled by migrations.
const DATABASE_PATH = join(PostyBirbDirectories.DATA_DIRECTORY, 'database.sql');
const exists = existsSync(DATABASE_PATH);

/*
 * TypeORM Database Provider
 * https://docs.nestjs.com/recipes/sql-typeorm
 */
export const TypeormDatabaseProviders: Provider[] = [
  {
    provide: DATABASE_CONNECTION,
    useFactory: async () => {
      return await createConnection({
        type: 'sqlite',
        database: DATABASE_PATH,
        synchronize: true, //!exists,
        entities,
      });
    },
  },
];

export function getTestDatabaseProvider(entities: any[]): Provider {
  return {
    provide: DATABASE_CONNECTION,
    useFactory: async () => {
      return await createConnection({
        type: 'sqlite',
        database: ':memory:',
        dropSchema: true,
        synchronize: true,
        logging: false,
        entities,
        name: DATABASE_CONNECTION,
      });
    },
  };
}
