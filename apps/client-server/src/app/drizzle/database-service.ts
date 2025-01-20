import { EntityId } from '@postybirb/types';
import { eq, KnownKeysOnly } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import {
  DBQueryConfig,
  ExtractTablesWithRelations,
} from 'drizzle-orm/relations';
import { DatabaseEntity } from './models/database-entity';
import * as schema from './schemas';

export type DrizzleDatabase = BetterSQLite3Database<typeof schema>;

type SchemaKey = keyof typeof schema;
type EntityConverter<TEntityClass extends DatabaseEntity> = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
) => TEntityClass;

type Insert<TSchemaKey extends SchemaKey> =
  (typeof schema)[TSchemaKey]['$inferInsert'];

type Select<TSchemaKey extends SchemaKey> =
  (typeof schema)[TSchemaKey]['$inferSelect'];

type ExtractedRelations = ExtractTablesWithRelations<typeof schema>;
type Relation<TSchemaKey extends SchemaKey> =
  TSchemaKey extends keyof ExtractedRelations
    ? ExtractedRelations[TSchemaKey]
    : never;

export class DatabaseService<
  TSchemaKey extends SchemaKey,
  TEntityClass extends DatabaseEntity,
> {
  constructor(
    public readonly db: DrizzleDatabase,
    private readonly schemaKey: TSchemaKey,
    private readonly classConverter: EntityConverter<TEntityClass>,
  ) {}

  private get schemaEntity() {
    return schema[this.schemaKey];
  }

  public async insert(value: Insert<TSchemaKey>): Promise<TEntityClass>;
  public async insert(value: Insert<TSchemaKey>[]): Promise<TEntityClass[]>;
  public async insert(
    value: Insert<TSchemaKey> | Insert<TSchemaKey>[],
  ): Promise<TEntityClass | TEntityClass[]> {
    const inserts = await this.db
      .insert(this.schemaEntity)
      .values(value)
      .returning();
    return this.classConverter(inserts.length > 1 ? inserts : inserts[0]);
  }

  public deleteById(id: EntityId[]) {
    return this.db
      .delete(this.schemaEntity)
      .where(eq(this.schemaEntity.id, id));
  }

  public async findById(id: EntityId, options?: { failIfNotFound: boolean }) {
    const record = await this.db.query[
      this.schemaKey as keyof typeof schema
    ].findFirst({
      where: eq(this.schemaEntity.id, id),
    });

    if (!record && options?.failIfNotFound) {
      throw new Error(`Record with id ${id} not found`);
    }

    return record ? this.classConverter(record) : null;
  }

  public async find<
    TConfig extends DBQueryConfig<
      'many',
      true,
      ExtractedRelations,
      Relation<TSchemaKey>
    >,
  >(
    query: KnownKeysOnly<
      TConfig,
      DBQueryConfig<'many', true, ExtractedRelations, Relation<TSchemaKey>>
    >,
  ) {
    const record =
      (await this.db.query[this.schemaKey as keyof DrizzleDatabase].findMany(
        query,
      )) ?? [];
    return this.classConverter(record);
  }

  public async findOne<
    TSelection extends Omit<
      DBQueryConfig<'many', true, ExtractedRelations, Relation<TSchemaKey>>,
      'limit'
    >,
  >(
    query: KnownKeysOnly<
      TSelection,
      Omit<
        DBQueryConfig<'many', true, ExtractedRelations, Relation<TSchemaKey>>,
        'limit'
      >
    >,
  ) {
    const record =
      await this.db.query[this.schemaKey as keyof DrizzleDatabase].findFirst(
        query,
      );
    return record ? this.classConverter(record) : null;
  }

  public async findAll(): Promise<TEntityClass[]> {
    const records = await this.db.query[
      this.schemaKey as keyof typeof schema
    ].findMany({});
    return records.map(this.classConverter);
  }

  public async update(id: EntityId, set: Partial<Select<TSchemaKey>>) {
    return this.db
      .update(this.schemaEntity)
      .set(set)
      .where(eq(this.schemaEntity.id, id));
  }
}
