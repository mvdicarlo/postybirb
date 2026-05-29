import { PostyBirbDirectories } from '@postybirb/fs';
import { IsTestEnvironment } from '@postybirb/utils/common';
import Database from 'better-sqlite3';
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';
import * as schema from './schemas';

export type PostyBirbDatabaseType = BetterSQLite3Database<typeof schema>;

const migrationsFolder = IsTestEnvironment()
  ? join(__dirname.split('libs')[0], 'apps', 'postybirb', 'src', 'migrations')
  : join(__dirname, 'migrations');
let db: PostyBirbDatabaseType;

/**
 * Get the database instance
 * @param {boolean} newInstance - Whether to get a new instance of the database or force a
 * new instance (mostly for testing)
 */
export function getDatabase() {
  if (!db) {
    if (IsTestEnvironment()) {
      // Use an in-memory database for tests to avoid filesystem I/O errors
      // (e.g. SQLITE_IOERR_FSTAT) in CI environments. Enable foreign-key
      // enforcement so that ON DELETE CASCADE / SET NULL constraints behave
      // identically to the production database.
      const sqlite = new Database(':memory:');
      sqlite.pragma('foreign_keys = ON');
      db = drizzle(sqlite, { schema });
    } else {
      const path = join(
        PostyBirbDirectories.DATA_DIRECTORY,
        `database-${process.env.POSTYBIRB_ENV}.sqlite`,
      );
      db = drizzle(path, { schema });
    }
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
