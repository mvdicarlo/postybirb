import Database from 'better-sqlite3';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { join } from 'path';

/**
 * Migration integrity guard.
 *
 * These tests run the real drizzle migrations against a database seeded with
 * representative data and assert that applying migrations never destroys it.
 *
 * They exist because a table-rebuild migration (`DROP TABLE ... RENAME`) ran
 * with foreign keys enabled and cascade-deleted `website-options` and
 * `website-data` rows. The in-migration `PRAGMA foreign_keys=OFF` is a no-op
 * because drizzle wraps migrations in a transaction. The generic guard below
 * will fail for any future migration that reintroduces this class of bug.
 */

type MigrationFile = ReturnType<typeof readMigrationFiles>[number];

type ColumnInfo = {
  name: string;
  type: string;
  notnull: number;
  pk: number;
};

const migrationsFolder = join(
  __dirname.split('libs')[0],
  'apps',
  'postybirb',
  'src',
  'migrations',
);

function loadMigrations(): MigrationFile[] {
  return readMigrationFiles({ migrationsFolder }).sort(
    (a, b) => a.folderMillis - b.folderMillis,
  );
}

/**
 * Applies a set of migrations exactly as production does: inside a single
 * transaction with foreign keys enabled.
 */
function applyMigrations(
  sqlite: Database.Database,
  migrations: MigrationFile[],
): void {
  sqlite.exec('BEGIN');
  try {
    for (const migration of migrations) {
      for (const statement of migration.sql) {
        sqlite.exec(statement);
      }
    }
    sqlite.exec('COMMIT');
  } catch (err) {
    sqlite.exec('ROLLBACK');
    throw err;
  }
}

function defaultForType(type: string): string | number {
  const upper = type.toUpperCase();
  if (
    upper.includes('INT') ||
    upper.includes('REAL') ||
    upper.includes('FLOA') ||
    upper.includes('DOUB') ||
    upper.includes('NUM')
  ) {
    return 0;
  }
  return 'x';
}

function tableExists(sqlite: Database.Database, table: string): boolean {
  return (
    sqlite
      .prepare(
        `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`,
      )
      .get(table) !== undefined
  );
}

function countRows(sqlite: Database.Database, table: string): number {
  return (
    sqlite.prepare(`SELECT COUNT(*) AS c FROM "${table}"`).get() as {
      c: number;
    }
  ).c;
}

/**
 * Inserts a single row into `table`, auto-filling NOT NULL / primary key columns
 * with type-appropriate placeholders. `overrides` provides explicit values
 * (e.g. ids and foreign keys); pass `undefined` to skip an optional column.
 */
function seedRow(
  sqlite: Database.Database,
  table: string,
  overrides: Record<string, unknown> = {},
): void {
  const columns = sqlite
    .prepare(`PRAGMA table_info("${table}")`)
    .all() as ColumnInfo[];

  const values: Record<string, unknown> = {};
  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(overrides, column.name)) {
      if (overrides[column.name] === undefined) {
        continue;
      }
      values[column.name] = overrides[column.name];
    } else if (column.pk || column.notnull) {
      values[column.name] = defaultForType(column.type);
    }
  }

  const names = Object.keys(values);
  const placeholders = names.map(() => '?').join(', ');
  sqlite
    .prepare(
      `INSERT INTO "${table}" (${names
        .map((n) => `"${n}"`)
        .join(', ')}) VALUES (${placeholders})`,
    )
    .run(...names.map((n) => values[n]));
}

/**
 * Seeds the account-rooted tables most affected by cascade deletes.
 * Requires that the corresponding tables already exist at the current schema.
 */
function seedAccountGraph(sqlite: Database.Database): void {
  seedRow(sqlite, 'account', { id: 'acc1' });
  seedRow(sqlite, 'submission', { id: 'sub1' });
  seedRow(sqlite, 'website-options', {
    id: 'wo1',
    accountId: 'acc1',
    submissionId: 'sub1',
  });
  if (tableExists(sqlite, 'website-data')) {
    seedRow(sqlite, 'website-data', { id: 'acc1' });
  }
}

function newDatabase(): Database.Database {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  return sqlite;
}

describe('migration integrity', () => {
  it('preserves account-rooted data across the full migration chain', () => {
    const sqlite = newDatabase();
    const migrations = loadMigrations();

    // Find the account-template refactor migration (the one that introduced the
    // regression) and split the chain just before it to emulate an upgrade.
    const targetIndex = migrations.findIndex((m) =>
      m.sql.join('\n').includes('defaultFileTemplateId'),
    );
    expect(targetIndex).toBeGreaterThan(0);

    applyMigrations(sqlite, migrations.slice(0, targetIndex));
    seedAccountGraph(sqlite);

    expect(countRows(sqlite, 'account')).toBe(1);
    expect(countRows(sqlite, 'website-options')).toBe(1);
    expect(countRows(sqlite, 'website-data')).toBe(1);

    // Apply the remaining (pending) migrations as production would.
    applyMigrations(sqlite, migrations.slice(targetIndex));

    // Data must survive the upgrade.
    expect(countRows(sqlite, 'account')).toBe(1);
    expect(countRows(sqlite, 'website-options')).toBe(1);
    expect(countRows(sqlite, 'website-data')).toBe(1);

    // And the new columns must exist.
    const accountColumns = (
      sqlite.prepare(`PRAGMA table_info("account")`).all() as ColumnInfo[]
    ).map((c) => c.name);
    expect(accountColumns).toEqual(
      expect.arrayContaining([
        'defaultFileTemplateId',
        'defaultMessageTemplateId',
      ]),
    );

    sqlite.close();
  });

  it('does not destroy seeded data when applying the latest migration', () => {
    const sqlite = newDatabase();
    const migrations = loadMigrations();
    expect(migrations.length).toBeGreaterThan(1);

    const allButLast = migrations.slice(0, -1);
    const last = migrations[migrations.length - 1];

    applyMigrations(sqlite, allButLast);
    seedAccountGraph(sqlite);

    const critical = ['account', 'submission', 'website-options', 'website-data'];
    const before = critical
      .filter((table) => tableExists(sqlite, table))
      .map((table) => [table, countRows(sqlite, table)] as const);

    applyMigrations(sqlite, [last]);

    for (const [table, count] of before) {
      // A table that still exists after the latest migration must keep its rows.
      if (tableExists(sqlite, table)) {
        expect(countRows(sqlite, table)).toBe(count);
      }
    }

    sqlite.close();
  });
});
