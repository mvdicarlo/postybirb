/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotFoundException } from '@nestjs/common';
import {
  getDatabase,
  Insert,
  PostyBirbDatabaseType,
  SchemaKey,
  Schemas,
  Select,
} from '@postybirb/database';
import { EntityId, NULL_ACCOUNT_ID } from '@postybirb/types';
import { eq, KnownKeysOnly, SQL } from 'drizzle-orm';
import {
  DBQueryConfig,
  ExtractTablesWithRelations,
} from 'drizzle-orm/relations';
import { fromDatabaseRecord } from '../models';
import { FindOptions } from './find-options.type';
import {
  DatabaseSchemaEntityMap,
  DatabaseSchemaEntityMapConst,
} from './schema-entity-map';

type ExtractedRelations = ExtractTablesWithRelations<typeof Schemas>;

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
    AccountSchema: [],
    DirectoryWatcherSchema: [],
    FileBufferSchema: [],
    PostQueueRecordSchema: [],
    PostRecordSchema: [],
    SettingsSchema: [],
    SubmissionFileSchema: [],
    SubmissionSchema: [],
    TagConverterSchema: [],
    TagGroupSchema: [],
    UserSpecifiedWebsiteOptionsSchema: [],
    WebsiteDataSchema: [],
    WebsiteOptionsSchema: [],
    WebsitePostRecordSchema: [],
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
    return Schemas[this.schemaKey];
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
    return Array.isArray(value) ? result : result[0];
  }

  public async deleteById(ids: EntityId[]) {
    if (ids.find((id) => id === NULL_ACCOUNT_ID)) {
      throw new Error('Cannot delete the null account');
    }
    const result = await this.db
      .delete(this.schemaEntity)
      .where(eq(this.schemaEntity.id, ids));
    this.notify(ids, 'delete');
    return result;
  }

  public async findById(
    id: EntityId,
    options?: FindOptions,
    load?: DBQueryConfig<
      'many',
      true,
      ExtractedRelations,
      Relation<TSchemaKey>
    >['with'],
  ): Promise<TEntityClass | null> {
    const record = await this.db.query[this.schemaKey].findFirst({
      where: eq(this.schemaEntity.id, id),
      with: {
        ...(load ?? this.load ?? {}),
      },
    });

    if (!record && options?.failOnMissing) {
      throw new NotFoundException(`Record with id ${id} not found`);
    }

    return record ? (this.classConverter(record) as TEntityClass) : null;
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
    await this.findById(id, { failOnMissing: true });

    await this.db
      // eslint-disable-next-line testing-library/await-async-query
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
