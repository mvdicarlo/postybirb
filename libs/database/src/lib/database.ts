import { PostyBirbDirectories } from '@postybirb/fs';
import { IsTestEnvironment } from '@postybirb/utils/common';
import { NodeSQLiteDatabase, drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'path';
import { relations } from './relations';
import { RepositoryRegistry } from './repositories/base/repository-registry';
import * as schema from './schemas';

export type PostyBirbDatabaseType = NodeSQLiteDatabase<
  typeof schema,
  typeof relations
>;

const migrationsFolder = IsTestEnvironment()
  ? join(__dirname.split('libs')[0], 'apps', 'postybirb', 'src', 'migrations')
  : join(__dirname, 'migrations');
let db: PostyBirbDatabaseType | undefined;

/**
 * Get the database instance
 */
export function getDatabase() {
  if (!db) {
    if (IsTestEnvironment()) {
      const sqlite = new DatabaseSync(':memory:');
      sqlite.exec('PRAGMA foreign_keys = ON');
      db = drizzle({ client: sqlite, schema, relations });
      migrate(db, { migrationsFolder });
    } else {
      const path = join(
        PostyBirbDirectories.DATA_DIRECTORY,
        `database-${process.env.POSTYBIRB_ENV}.sqlite`,
      );
      const sqlite = new DatabaseSync(path);
      sqlite.exec('PRAGMA foreign_keys = ON');
      db = drizzle({ client: sqlite, schema, relations });
      migrate(db, { migrationsFolder });
    }
  }

  return db;
}

export function clearDatabase() {
  db = undefined;
  RepositoryRegistry.clear();
}
