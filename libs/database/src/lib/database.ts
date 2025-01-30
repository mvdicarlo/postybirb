import { PostyBirbDirectories } from '@postybirb/fs';
import { IsTestEnvironment } from '@postybirb/utils/electron';
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';
import * as schema from './schemas';

export type PostyBirbDatabaseType = BetterSQLite3Database<typeof schema>;

const migrationsFolder = IsTestEnvironment()
  ? join(__dirname.split('libs')[0], 'apps', 'postybirb', 'src', 'migrations')
  : join(__dirname, 'migrations');

const path = IsTestEnvironment()
  ? ':memory:'
  : join(PostyBirbDirectories.DATA_DIRECTORY, 'drizzle.db');
let db: PostyBirbDatabaseType;

/**
 * Get the database instance
 * @param {boolean} newInstance - Whether to get a new instance of the database or force a
 * new instance (mostly for testing)
 */
export function getDatabase() {
  if (!db) {
    db = drizzle(path, { schema });
    migrate(db, { migrationsFolder });
  }

  return db;
}

/**
 * Clear the database instance.
 * Used for testing.
 */
export function clearDatabase() {
  db = undefined;
}
