import { Logger } from '@postybirb/logger';
import type Database from 'better-sqlite3';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { basename, dirname, join } from 'path';

const logger = Logger('DatabaseBackup');

/**
 * Number of timestamped pre-migration backups to retain. Older backups beyond
 * this count are pruned after each successful backup.
 */
const MAX_BACKUPS = 5;

/**
 * Name of the subfolder (alongside the database file) that holds pre-migration
 * backups.
 */
const BACKUP_DIR_NAME = 'backups';

/**
 * Drizzle's migration bookkeeping table. Mirrors the default used by
 * `drizzle-orm/better-sqlite3/migrator`.
 */
const MIGRATIONS_TABLE = '__drizzle_migrations';

/**
 * Creates a timestamped, consistent backup of the database file when one or
 * more migrations are pending.
 *
 * This is a safety net against migrations that unexpectedly destroy data (for
 * example a table rebuild that triggers `ON DELETE CASCADE`). The backup is
 * taken before {@link migrate} runs, so a damaged migration can always be
 * recovered from the most recent snapshot.
 *
 * Backup failures never block startup — the migration remains the source of
 * truth — but they are logged loudly so they can be investigated.
 *
 * @param sqlite - The opened better-sqlite3 connection.
 * @param databasePath - Absolute path to the database file being backed up.
 * @param migrationsFolder - Folder containing the drizzle migrations.
 */
export function backupBeforePendingMigrations(
  sqlite: Database.Database,
  databasePath: string,
  migrationsFolder: string,
): void {
  try {
    if (!hasPendingMigrations(sqlite, migrationsFolder)) {
      return;
    }

    const backupPath = createBackup(sqlite, databasePath);
    logger
      .withMetadata({ backupPath })
      .info('Created pre-migration database backup');

    pruneOldBackups(databasePath);
  } catch (err) {
    logger
      .withError(err)
      .error('Failed to create pre-migration database backup');
  }
}

/**
 * Determines whether any migration newer than the last-applied one exists.
 */
function hasPendingMigrations(
  sqlite: Database.Database,
  migrationsFolder: string,
): boolean {
  const migrations = readMigrationFiles({ migrationsFolder });
  if (migrations.length === 0) {
    return false;
  }

  const maxFolderMillis = migrations.reduce(
    (max, migration) => Math.max(max, migration.folderMillis),
    0,
  );

  return maxFolderMillis > getLastAppliedFolderMillis(sqlite);
}

/**
 * Reads the `folderMillis` of the most recently applied migration, or 0 when no
 * migrations have been applied (the bookkeeping table may not exist yet).
 */
function getLastAppliedFolderMillis(sqlite: Database.Database): number {
  try {
    const row = sqlite
      .prepare(
        `SELECT created_at FROM "${MIGRATIONS_TABLE}" ORDER BY created_at DESC LIMIT 1`,
      )
      .get() as { created_at: number } | undefined;
    return Number(row?.created_at ?? 0);
  } catch {
    // Table does not exist yet => nothing has been applied.
    return 0;
  }
}

/**
 * Returns the directory that holds pre-migration backups, creating it if needed.
 */
function getBackupDir(databasePath: string): string {
  const backupDir = join(dirname(databasePath), BACKUP_DIR_NAME);
  mkdirSync(backupDir, { recursive: true });
  return backupDir;
}

/**
 * Writes a consistent standalone copy of the database using `VACUUM INTO`,
 * which is safe regardless of journal mode and does not require the connection
 * to be idle. Returns the backup file path.
 */
function createBackup(
  sqlite: Database.Database,
  databasePath: string,
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(
    getBackupDir(databasePath),
    `${basename(databasePath)}.backup-${timestamp}.sqlite`,
  );
  // Escape single quotes for the SQL string literal (paths are app-controlled,
  // but this keeps it robust).
  const escapedPath = backupPath.replace(/'/g, "''");
  sqlite.exec(`VACUUM INTO '${escapedPath}'`);
  return backupPath;
}

/**
 * Deletes the oldest pre-migration backups, keeping the {@link MAX_BACKUPS}
 * most recent.
 */
function pruneOldBackups(databasePath: string): void {
  const backupDir = getBackupDir(databasePath);
  const prefix = `${basename(databasePath)}.backup-`;

  const backups = readdirSync(backupDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.sqlite'))
    .map((name) => join(backupDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  for (const stale of backups.slice(MAX_BACKUPS)) {
    rmSync(stale, { force: true });
  }
}
