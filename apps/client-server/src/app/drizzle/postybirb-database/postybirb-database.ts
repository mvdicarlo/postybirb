/* eslint-disable @typescript-eslint/no-explicit-any */
import { EntityId } from '@postybirb/types';
import { eq, KnownKeysOnly, SQL } from 'drizzle-orm';
import {
  DBQueryConfig,
  ExtractTablesWithRelations,
} from 'drizzle-orm/relations';
import { FindOptions } from '../../database/repositories/postybirb-repository';
import { fromDatabaseRecord } from '../models/database-entity';
import * as schema from '../schemas';
import { getDatabase, PostyBirbDatabaseType } from './database-instance';
import {
  DatabaseSchemaEntityMap,
  DatabaseSchemaEntityMapConst,
} from './schema-entity-map';

export type SchemaKey = keyof PostyBirbDatabaseType['_']['schema'];

export type PostyBirbTransaction = Parameters<
  Parameters<PostyBirbDatabaseType['transaction']>['0']
>['0'];

export type Insert<TSchemaKey extends SchemaKey> =
  (typeof schema)[TSchemaKey]['$inferInsert'];

export type Select<TSchemaKey extends SchemaKey> =
  (typeof schema)[TSchemaKey]['$inferSelect'];

type ExtractedRelations = ExtractTablesWithRelations<typeof schema>;

type Relation<TSchemaKey extends SchemaKey> =
  PostyBirbDatabaseType['_']['schema'][TSchemaKey];

export type Action = 'delete' | 'insert' | 'update';

type SubscribeCallback = (ids: EntityId[], action: Action) => void;

export class PostyBirbDatabase<
  TSchemaKey extends SchemaKey,
  TEntityClass = DatabaseSchemaEntityMap[TSchemaKey],
> {
  public readonly db: PostyBirbDatabaseType;

  private static readonly subscribers: Record<
    SchemaKey,
    Array<SubscribeCallback>
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
    private readonly schemaKey: TSchemaKey,
    private readonly load?: DBQueryConfig<
      'many',
      true,
      ExtractedRelations,
      Relation<TSchemaKey>
    >['with'],
  ) {
    this.db = getDatabase();
  }

  public subscribe(key: SchemaKey[], callback: SubscribeCallback): this;
  public subscribe(key: SchemaKey, callback: SubscribeCallback): this;
  public subscribe(
    key: SchemaKey | SchemaKey[],
    callback: SubscribeCallback,
  ): this {
    if (Array.isArray(key)) {
      key.forEach((k) => this.subscribe(k, callback));
      return this;
    }
    if (!PostyBirbDatabase.subscribers[key]) {
      PostyBirbDatabase.subscribers[key] = [];
    }
    PostyBirbDatabase.subscribers[key].push(callback);
    return this;
  }

  private notify(ids: EntityId[], action: Action) {
    PostyBirbDatabase.subscribers[this.schemaKey].forEach((callback) =>
      callback(ids, action),
    );
  }

  public get EntityClass() {
    return DatabaseSchemaEntityMapConst[this.schemaKey];
  }

  public get schemaEntity() {
    return schema[this.schemaKey];
  }

  private classConverter(value: any[]): TEntityClass[];
  private classConverter(value: any): TEntityClass;
  private classConverter(value: any | any[]): TEntityClass | TEntityClass[] {
    if (Array.isArray(value)) {
      return fromDatabaseRecord(this.EntityClass, value);
    }
    return fromDatabaseRecord(this.EntityClass, value);
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
    const result = await Promise.all(
      inserts.map((insert) => this.findById(insert.id)),
    );
    return inserts.length > 1 ? result : result[0];
  }

  public async deleteById(ids: EntityId[]) {
    const result = await this.db
      .delete(this.schemaEntity)
      .where(eq(this.schemaEntity.id, ids));
    this.notify(ids, 'delete');
    return result;
  }

  public async findById(
    id: EntityId,
    options?: FindOptions,
  ): Promise<TEntityClass | null> {
    const record = await this.db.query[this.schemaKey].findFirst({
      where: eq(this.schemaEntity.id, id),
      with: {
        ...(this.load ?? {}),
      },
    });

    if (!record && options?.failOnMissing) {
      throw new Error(`Record with id ${id} not found`);
    }

    return record ? this.classConverter(record) : null;
  }

  public async select(query: SQL): Promise<TEntityClass[]> {
    const records = await this.db.select().from(this.schemaEntity).where(query);
    return this.classConverter(records);
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
  ): Promise<TEntityClass[]> {
    const record: any[] =
      (await this.db.query[
        this.schemaKey as keyof PostyBirbDatabaseType
      ].findMany({
        ...query,
        with: query.with
          ? query.with
          : {
              ...(this.load ?? {}),
            },
      })) ?? [];
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
  ): Promise<TEntityClass | null> {
    const record = await this.db.query[
      this.schemaKey as keyof PostyBirbDatabaseType
    ].findFirst({
      ...query,
      with: query.with
        ? query.with
        : {
            ...(this.load ?? {}),
          },
    });
    return record ? this.classConverter(record) : null;
  }

  public async findAll(): Promise<TEntityClass[]> {
    const records: object[] = await this.db.query[this.schemaKey].findMany({
      with: {
        ...(this.load ?? {}),
      },
    });
    return this.classConverter(records);
  }

  public async update(
    id: EntityId,
    set: Partial<Select<TSchemaKey>>,
  ): Promise<TEntityClass> {
    await this.db
      .update(this.schemaEntity)
      .set(set)
      .where(eq(this.schemaEntity.id, id));
    this.notify([id], 'update');
    return this.findById(id);
  }

  public count(filter?: SQL): Promise<number> {
    return this.db.$count(this.schemaEntity, filter);
  }
}
