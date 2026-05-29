import type { EntityId, IEntity } from '@postybirb/types';
import { NULL_ACCOUNT_ID } from '@postybirb/types';
import type { RunResult } from 'better-sqlite3';
import { eq, inArray, SQL } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { getDatabase, type PostyBirbDatabaseType } from '../../database';
import type { Insert, SchemaKey } from '../../helper-types';
import { EntityNotFoundError } from './entity-not-found.error';
import { HydrationContext } from './hydration-context';
import { RepositoryRegistry } from './repository-registry';
import { SubscriberBus } from './subscriber-bus';
import type {
    Action,
    DefaultWithFor,
    EntityCtor,
    FindFirstConfig,
    FindManyConfig,
    SchemaQuery,
    SchemaTable,
    SubscriberCb,
} from './types';

/**
 * Constructor config passed by a subclass to `super(...)`. The literal
 * `schemaKey` plus the concrete `table` / `query` / `EntityClass` lets the
 * base class operate without ever indexing `db.query[K]` from a generic
 * type parameter, which would widen the column types to `unknown`.
 */
export interface EntityRepositoryConfig<
  TKey extends SchemaKey,
  TEntity extends IEntity,
> {
  schemaKey: TKey;
  table: SchemaTable<TKey>;
  query: SchemaQuery<TKey>;
  EntityClass: EntityCtor<TEntity>;
  defaultWith?: DefaultWithFor<TKey>;
}

/**
 * Generic base class for all repositories. Subclasses pass concrete literal
 * `TKey` and a concrete `TEntity`, which narrows every generic relationship
 * (table, query handle, insert/select shape, with-clause, etc.) at the
 * property level. See `submission.repository.ts` for a representative
 * subclass.
 *
 * Behavioural notes:
 *
 *  - `findById({ failOnMissing: true })` throws `EntityNotFoundError` with
 *    the standardised message `'{SchemaKey} with id "{id}" not found'`.
 *  - `find` / `findOne` apply `defaultWith` when the caller's config has no
 *    `with` clause; a caller-supplied `with` always wins.
 *  - `findAll` always applies `defaultWith`. Callers needing a different
 *    eager-load set must use `find({ with: ... })`.
 *  - `insert` returns hydrated entities by re-fetching each inserted id
 *    through `findById`, preserving the default eager-load on the
 *    returned entity.
 *  - `update` precondition-checks via `findById({ failOnMissing: true })`
 *    before issuing SQL, then re-fetches and returns the fresh entity.
 *  - All write operations broadcast through `SubscriberBus.notify` after
 *    SQL succeeds (coalesced per `(schemaKey, action)` per tick).
 *  - `select(SQL)` bypasses the relational query API; results have no
 *    relations but are still hydrated via `EntityClass.fromRow`.
 */
export abstract class EntityRepository<
  TKey extends SchemaKey,
  TEntity extends IEntity,
> {
  /**
   * The underlying drizzle database. Public so callers that need raw db
   * access (e.g. `withTransactionContext(repo.db, ...)`) can reach it.
   */
  public readonly db: PostyBirbDatabaseType;

  public readonly schemaKey: TKey;

  /**
   * Drizzle table descriptor for the underlying schema.
   */
  public readonly table: SchemaTable<TKey>;

  protected readonly query: SchemaQuery<TKey>;

  protected readonly EntityClass: EntityCtor<TEntity>;

  protected readonly defaultWith?: DefaultWithFor<TKey>;

  /**
   * Reference to the table's `id` column. Resolved once via a single cast
   * in the base constructor; every schema in this workspace spreads
   * `CommonSchema()` which guarantees the column exists. Centralising the
   * cast here keeps the per-method code (`eq(this.idColumn, ...)`,
   * `inArray(this.idColumn, ...)`) free of widening assertions.
   */
  private readonly idColumn: AnySQLiteColumn;

  protected constructor(config: EntityRepositoryConfig<TKey, TEntity>) {
    this.schemaKey = config.schemaKey;
    this.table = config.table;
    this.query = config.query;
    this.EntityClass = config.EntityClass;
    this.defaultWith = config.defaultWith;
    this.idColumn = (config.table as unknown as { id: AnySQLiteColumn }).id;
    this.db = getDatabase();
    RepositoryRegistry.register(
      this.schemaKey,
      this as unknown as EntityRepository<TKey, never>,
    );
  }

  // ---------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------

  public async findById(
    id: EntityId,
    options?: { failOnMissing?: boolean },
    withOverride?: DefaultWithFor<TKey>,
  ): Promise<TEntity | null> {
    const record = await this.query.findFirst({
      where: eq(this.idColumn, id),
      with: (withOverride ?? this.defaultWith ?? {}) as never,
    } as never);

    if (!record) {
      if (options?.failOnMissing) {
        throw new EntityNotFoundError(this.schemaKey, id);
      }
      return null;
    }

    return this.EntityClass.fromRow(record as never);
  }

  public async findAll(): Promise<TEntity[]> {
    const records = (await this.query.findMany({
      with: (this.defaultWith ?? {}) as never,
    } as never)) as unknown as readonly never[];
    return this.EntityClass.fromRows(records);
  }

  public async find(config: FindManyConfig<TKey>): Promise<TEntity[]> {
    const records = (await this.query.findMany({
      ...(config as object),
      with: (config.with ?? this.defaultWith ?? {}) as never,
    } as never)) as unknown as readonly never[];
    return this.EntityClass.fromRows(records);
  }

  public async findOne(config: FindFirstConfig<TKey>): Promise<TEntity | null> {
    const record = await this.query.findFirst({
      ...(config as object),
      with: (config.with ?? this.defaultWith ?? {}) as never,
    } as never);
    return record ? this.EntityClass.fromRow(record as never) : null;
  }

  /**
   * Raw `db.select().from(this.table).where(query)`. Returns rows without
   * relations, hydrated via `EntityClass.fromRow`. Use when the relational
   * query API does not support the filter you need (e.g. complex SQL
   * expressions) — for everything else, prefer `find`.
   */
  public async select(query: SQL): Promise<TEntity[]> {
    const records = (await this.db
      .select()
      .from(this.table as never)
      .where(query)) as unknown as readonly never[];
    return this.EntityClass.fromRows(records, new HydrationContext());
  }

  public count(filter?: SQL): Promise<number> {
    return this.db.$count(this.table as never, filter);
  }

  // ---------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------

  public async insert(values: Insert<TKey>): Promise<TEntity>;
  public async insert(values: Insert<TKey>[]): Promise<TEntity[]>;
  public async insert(
    values: Insert<TKey> | Insert<TKey>[],
  ): Promise<TEntity | TEntity[]> {
    const inserted = (await this.db
      .insert(this.table as never)
      .values(values as never)
      .returning()) as Array<{ id: EntityId }>;

    const ids = inserted.map((row) => row.id);
    this.notify(ids, 'insert');

    // Re-fetch each row so the returned entity reflects `defaultWith`
    // eager-loads.
    const hydrated = await Promise.all(
      ids.map((id) => this.findById(id, { failOnMissing: true })),
    );
    const nonNull = hydrated as TEntity[];
    return Array.isArray(values) ? nonNull : nonNull[0];
  }

  public async update(
    id: EntityId,
    set: Partial<Insert<TKey>>,
  ): Promise<TEntity> {
    // Precondition: row must exist. Throws EntityNotFoundError if not.
    await this.findById(id, { failOnMissing: true });

    await this.db
      .update(this.table as never)
      .set(set as never)
      .where(eq(this.idColumn, id));
    this.notify([id], 'update');

    const fresh = await this.findById(id, { failOnMissing: true });
    // `failOnMissing` guarantees non-null; the cast is safe and the
    // signature can stay honestly `Promise<TEntity>`.
    return fresh as TEntity;
  }

  public async deleteById(ids: EntityId[]): Promise<RunResult> {
    if (ids.some((id) => id === NULL_ACCOUNT_ID)) {
      throw new Error('Cannot delete the null account');
    }
    const result = (await this.db
      .delete(this.table as never)
      .where(inArray(this.idColumn, ids))) as RunResult;
    this.notify(ids, 'delete');
    return result;
  }

  // ---------------------------------------------------------------------
  // Pub/sub passthroughs
  // ---------------------------------------------------------------------

  public subscribe(keys: SchemaKey | SchemaKey[], cb: SubscriberCb): this {
    SubscriberBus.subscribe(keys, cb);
    return this;
  }

  /**
   * Per-repo shortcut for `SubscriberBus.notify(this.schemaKey, ids, action)`.
   * Coalesced. Callers needing synchronous delivery should call
   * `SubscriberBus.notifyImmediate` directly.
   */
  public notify(ids: EntityId[], action: Action): void {
    SubscriberBus.notify(this.schemaKey, ids, action);
  }
}
