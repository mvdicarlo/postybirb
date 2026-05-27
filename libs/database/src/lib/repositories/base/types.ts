import type { EntityId } from '@postybirb/types';
import type { DBQueryConfig, ExtractTablesWithRelations } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { PostyBirbDatabaseType } from '../../database';
import type { SchemaKey } from '../../helper-types';
import type * as relations from '../../relations/relations';
import type * as schemas from '../../schemas';
import type { EntityRepository } from './entity-repository';
import type { HydrationContext } from './hydration-context';

/**
 * Combined type of all drizzle schemas + relations, used to extract the
 * `ExtractedRelations` map drizzle's `DBQueryConfig` needs.
 *
 * This intentionally mirrors the `Schemas` namespace constructed at runtime
 * in `libs/database/src/index.ts` but stays type-only here to avoid a
 * circular import with the barrel.
 */
export type AllSchemas = typeof schemas & typeof relations;

export type ExtractedRelations = ExtractTablesWithRelations<AllSchemas>;

/**
 * Subset of `SchemaKey` that names a drizzle *table* (as opposed to a
 * relations binding). In this workspace every `SchemaKey` is also a
 * `TableSchemaKey`; the alias exists to document intent.
 */
export type TableSchemaKey = SchemaKey & keyof typeof schemas;

/**
 * The drizzle table descriptor for a given schema key. Derived from the
 * `schemas` namespace directly (not from `db._.schema`, which mixes tables
 * with relations bindings and erases the per-column shape).
 *
 * Generic indexed-access types cannot be narrowed inside the base class,
 * so the base does NOT read columns off `SchemaTable<K>` directly. The
 * shared `id` column is exposed separately via the constructor config
 * (`idColumn`) so the base can issue `eq(this.idColumn, ...)` without a
 * per-call cast.
 */
export type SchemaTable<K extends SchemaKey> =
  (typeof schemas)[K & TableSchemaKey];

/**
 * A subset of relations to eager-load. Used for `defaultWith` on a
 * repository and for per-call `with` overrides on `find` / `findOne` /
 * `findById`.
 */
export type DefaultWithFor<K extends SchemaKey> = DBQueryConfig<
  'many',
  true,
  ExtractedRelations,
  SchemaTable<K>
>['with'];

/**
 * Full `findMany` config (where / with / orderBy / limit / offset / etc.).
 */
export type FindManyConfig<K extends SchemaKey> = DBQueryConfig<
  'many',
  true,
  ExtractedRelations,
  SchemaTable<K>
>;

/**
 * `findFirst` config — `findMany` minus `limit`.
 */
export type FindFirstConfig<K extends SchemaKey> = Omit<
  FindManyConfig<K>,
  'limit'
>;

/**
 * The drizzle relational-query handle for a given schema key. Indexing
 * `db.query[K]` from a *concrete literal* key narrows to this; indexing it
 * from a generic `K extends SchemaKey` widens to a union that TS can no
 * longer call safely. Subclasses pass the narrowed handle into the base.
 */
export type SchemaQuery<K extends SchemaKey> = PostyBirbDatabaseType['query'][K];

/**
 * Write actions broadcast through `SubscriberBus`.
 */
export type Action = 'insert' | 'update' | 'delete';

/**
 * Subscriber callback. The third argument (`schemaKey`) is new vs the
 * legacy `PostyBirbDatabase` callback and is optional from the caller's
 * perspective (existing two-arg callbacks still type-check).
 */
export type SubscriberCb<K extends SchemaKey = SchemaKey> = (
  ids: EntityId[],
  action: Action,
  schemaKey: K,
) => void;

/**
 * Entity classes used by repositories must provide a `fromRow` /
 * `fromRows` static for hydration. The instance type is parameterized.
 */
export interface EntityCtor<T> {
  new (...args: never[]): T;
  /**
   * Hydrate a single row into an entity. The optional `ctx` enables
   * identity dedup across a single top-level repository call.
   */
  fromRow(row: never, ctx?: HydrationContext): T;
  /**
   * Hydrate many rows. Implementations MUST share `ctx` across all rows
   * so back-references collapse to identity.
   */
  fromRows(rows: readonly never[], ctx?: HydrationContext): T[];
}

/**
 * Re-export of `EntityId` so consumers can import everything repository-
 * related from `@postybirb/database` without separately importing
 * `@postybirb/types`.
 */
export type { EntityId };

/**
 * Extracts the entity type from a repository type. Used by
 * `PostyBirbService` to type `findById`/`findAll` return values.
 */
export type RepoEntity<R> =
  R extends EntityRepository<SchemaKey, infer T> ? T : never;
