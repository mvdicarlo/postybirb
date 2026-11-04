import type { SQL, SQLWrapper } from 'drizzle-orm';

export interface WebsiteOptionsMigration {
  readonly version: number;
  readonly name: string;
  readonly where?: (columns: { data: SQLWrapper }) => SQL;
  readonly migrate: (
    data: Readonly<Record<string, unknown>>,
  ) => Record<string, unknown>;
}

const migrationsByModel = new WeakMap<
  object,
  readonly WebsiteOptionsMigration[]
>();

export function MigrateWebsiteOptions(
  migrations: readonly WebsiteOptionsMigration[],
): ClassDecorator {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1 || !migration.name.trim()) {
      throw new Error(
        'Website option migrations must have names and consecutive versions starting at 1',
      );
    }
  });
  const bundles = Object.freeze(
    migrations.map((migration) => Object.freeze({ ...migration })),
  );

  return (model) => {
    if (migrationsByModel.has(model)) {
      throw new Error(
        'Declare website option migrations in a single ordered list',
      );
    }
    migrationsByModel.set(model, bundles);
  };
}

export function getWebsiteOptionsMigrations(
  model: object,
): readonly WebsiteOptionsMigration[] {
  return migrationsByModel.get(model) ?? [];
}
