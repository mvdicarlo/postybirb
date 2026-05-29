import { PostyBirbDirectories } from '@postybirb/fs';
import { IsTestEnvironment } from '@postybirb/utils/common';
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { RepositoryRegistry } from './repositories/base/repository-registry';
import * as schema from './schemas';

/**
 * The schema barrel (`./schemas`) exports both table definitions AND their
 * co-located `relations()` bindings, which is all drizzle needs for the
 * relational query API (`db.query.X.findMany({ with: ... })`).
 */
export type PostyBirbDatabaseType = BetterSQLite3Database<typeof schema>;

const migrationsFolder = IsTestEnvironment()
  ? join(__dirname.split('libs')[0], 'apps', 'postybirb', 'src', 'migrations')
  : join(__dirname, 'migrations');
let db: PostyBirbDatabaseType | undefined;

/**
 * Get the database instance
 */
export function getDatabase() {
  if (!db) {
    const path = IsTestEnvironment()
      ? ':memory:'
      : join(
          PostyBirbDirectories.DATA_DIRECTORY,
          `database-${process.env.POSTYBIRB_ENV}.sqlite`,
        );
    db = drizzle(path, { schema });
    migrate(db, { migrationsFolder });
  }

  return db;
}

/**
 * Clear the database instance.
 * Used for testing.
 *
 * Also clears the `RepositoryRegistry`. Repositories cache `getDatabase()`
 * at construction time; without clearing the registry, the next test that
 * constructs new repositories would have its `register()` call ignored
 * (first-registration-wins) and any consumer using
 * `RepositoryRegistry.get(...)` (e.g. `SubmissionFile.load()`) would query
 * the prior, now-discarded database instance.
 */
export function clearDatabase() {
  db = undefined;
  RepositoryRegistry.clear();
}
