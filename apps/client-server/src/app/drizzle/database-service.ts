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

type SchemaKey = keyof DrizzleDatabase['_']['schema'];
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
  DrizzleDatabase['_']['schema'][TSchemaKey];

export type Action = 'delete' | 'insert' | 'update';

export class DatabaseService<
  TSchemaKey extends SchemaKey,
  TEntityClass extends DatabaseEntity,
> {
  private static readonly subscribers: Record<
    SchemaKey,
    Array<(ids: EntityId[], action: Action) => void>
  > = {
    account: [],
    directoryWatcher: [],
    fileBuffer: [],
    postQueueRecord: [],
    postRecord: [],
    settings: [],
    submissionFile: [],
    submission: [],
    tagConverter: [],
    tagGroup: [],
    userSpecifiedWebsiteOptions: [],
    websiteData: [],
    websiteOptions: [],
    websitePostRecord: [],
  };

  constructor(
    public readonly db: DrizzleDatabase,
    private readonly schemaKey: TSchemaKey,
    private readonly classConverter: EntityConverter<TEntityClass>,
  ) {}

  public static subscribe(
    key: SchemaKey,
    callback: (ids: EntityId[], action: Action) => void,
  ) {
    if (!DatabaseService.subscribers[key]) {
      DatabaseService.subscribers[key] = [];
    }
    DatabaseService.subscribers[key].push(callback);
  }

  private notify(ids: EntityId[], action: Action) {
    DatabaseService.subscribers[this.schemaKey].forEach((callback) =>
      callback(ids, action),
    );
  }

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
    this.notify(
      inserts.map((insert) => insert.id),
      'insert',
    );
    return this.classConverter(inserts.length > 1 ? inserts : inserts[0]);
  }

  public async deleteById(ids: EntityId[]) {
    const result = await this.db
      .delete(this.schemaEntity)
      .where(eq(this.schemaEntity.id, ids));
    this.notify(ids, 'delete');
    return result;
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
    const record = (await this.db.query[this.schemaKey].findMany(query)) ?? [];
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
    await this.db
      .update(this.schemaEntity)
      .set(set)
      .where(eq(this.schemaEntity.id, id));
    this.notify([id], 'update');
  }
}
