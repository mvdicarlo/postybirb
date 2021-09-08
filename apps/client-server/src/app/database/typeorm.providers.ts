import { Provider } from '@nestjs/common';
import { createConnection } from 'typeorm';
import { PostyBirbDirectories } from '@postybirb/fs';
import { join } from 'path';
import { DATABASE_CONNECTION } from '../constants';

export const typeormDatabaseProviders: Provider[] = [
  {
    provide: DATABASE_CONNECTION,
    useFactory: async () =>
      await createConnection({
        type: 'sqlite',
        database: join(PostyBirbDirectories.DATA_DIRECTORY, 'database.sql'),
      }),
  },
];
