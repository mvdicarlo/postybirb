import { PostyBirbDirectories } from '@postybirb/fs';
import { IsTestEnvironment } from '@postybirb/utils/common';
import Database from 'better-sqlite3';
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync } from 'fs';
import { join } from 'path';
import { backupBeforePendingMigrations } from './migration-backup';
import { RepositoryRegistry } from './repositories/base/repository-registry';
import * as schema from './schemas';

export type PostyBirbDatabaseType = BetterSQLite3Database<typeof schema>;

const migrationsFolder = IsTestEnvironment()
  ? join(__dirname.split('libs')[0], 'apps', 'postybirb', 'src', 'migrations')
  : join(__dirname, 'migrations');
let db: PostyBirbDatabaseType | undefined;

/**
 * Apply pending migrations with foreign-key enforcement disabled on the
 * connection for the duration of the run.
 *
 * drizzle-kit emits `PRAGMA foreign_keys=OFF` inside table-rebuild migrations to
 * stop cascades from firing while a table is dropped and recreated, but
 * drizzle's migrator wraps every migration in a single transaction and SQLite
 * treats `PRAGMA foreign_keys` as a no-op inside a transaction. The net effect
 * is that a `DROP TABLE` during a rebuild silently cascade-deletes child rows
 * (this is exactly how the 4.0.40 default-website-options data loss happened).
 *
 * Toggling the pragma here — outside (before) the migrator's transaction — is the
 * only reliable way to neutralize it. `PRAGMA defer_foreign_keys` does NOT work:
 * SQLite performs cascading actions immediately even when constraint checks are
 * deferred.
 *
 * @see https://github.com/drizzle-team/drizzle-orm/issues/5782
 */
function runMigrations(
  database: PostyBirbDatabaseType,
  sqlite: Database.Database,
) {
  sqlite.pragma('foreign_keys = OFF');
  try {
    migrate(database, { migrationsFolder });
  } finally {
    sqlite.pragma('foreign_keys = ON');
  }
}

/**
 * Get the database instance
 */
export function getDatabase() {
  if (!db) {
    if (IsTestEnvironment()) {
      const sqlite = new Database(':memory:');
      sqlite.pragma('foreign_keys = ON');
      db = drizzle(sqlite, { schema });
      runMigrations(db, sqlite);
    } else {
      const path = join(
        PostyBirbDirectories.DATA_DIRECTORY,
        `database-${process.env.POSTYBIRB_ENV}.sqlite`,
      );
      const databaseExistedBefore = existsSync(path);
      const sqlite = new Database(path);
      sqlite.pragma('foreign_keys = ON');
      db = drizzle(sqlite, { schema });
      // Snapshot existing user data before applying any pending migrations so a
      // destructive migration can always be recovered. Skipped for brand-new
      // databases, which have nothing to lose.
      if (databaseExistedBefore) {
        backupBeforePendingMigrations(sqlite, path, migrationsFolder);
      }
      runMigrations(db, sqlite);
    }
  }

  return db;
}

export function clearDatabase() {
  db = undefined;
  RepositoryRegistry.clear();
}
