import { PostyBirbDirectories } from '@postybirb/fs';
import { IsTestEnvironment } from '@postybirb/utils/common';
import Database from 'better-sqlite3';
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';
import { RepositoryRegistry } from './repositories/base/repository-registry';
import * as schema from './schemas';

export type PostyBirbDatabaseType = BetterSQLite3Database<typeof schema>;

const migrationsFolder = IsTestEnvironment()
  ? join(__dirname.split('libs')[0], 'apps', 'postybirb', 'src', 'migrations')
  : join(__dirname, 'migrations');
let db: PostyBirbDatabaseType | undefined;

export function getDatabase() {
  if (!db) {
    if (IsTestEnvironment()) {
      const sqlite = new Database(':memory:');
      sqlite.pragma('foreign_keys = ON');
      db = drizzle(sqlite, { schema });
      migrate(db, { migrationsFolder });
    } else {
      const path = join(
        PostyBirbDirectories.DATA_DIRECTORY,
        `database-${process.env.POSTYBIRB_ENV}.sqlite`,
      );
      db = drizzle(path, { schema });
    }
  }

  return db;
}

export function clearDatabase() {
  db = undefined;
  RepositoryRegistry.clear();
}
