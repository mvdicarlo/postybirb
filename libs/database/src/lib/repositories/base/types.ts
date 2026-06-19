import type { EntityId, IEntity } from '@postybirb/types';
import type { DBQueryConfig } from 'drizzle-orm';
import type { PostyBirbDatabaseType } from '../../database';
import type { SchemaKey } from '../../helper-types';
import type { relations } from '../../relations';
import type * as schemas from '../../schemas';
import type { EntityRepository } from './entity-repository';
import type { HydrationContext } from './hydration-context';

/**
 * The schemas barrel exports the drizzle table definitions. Relations now
 * live in a single `defineRelations()` binding (`../../relations`) per
 * Relational Queries v2.
 */
export type AllSchemas = typeof schemas;

/**
 * The Relational Queries v2 config produced by `defineRelations`. This is a
 * `TablesRelationalConfig` keyed by the schema export names (e.g.
 * `SubmissionSchema`), which is exactly how `db.query[K]` is keyed.
 */
export type ExtractedRelations = typeof relations;

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
 * Full `findMany` config (where / with / orderBy / limit / offset / etc.)
 * for Relational Queries v2. Precise per-table `K`, so concrete repository
 * call sites get fully-typed `where` / `with` clauses.
 *
 * NOTE: this type is invariant in `K` (the v2 `with` / `where` shapes differ
 * per table). The base-class generic constraint therefore uses
 * `EntityRepository<any, …>` (see `RepoEntity` / `PostyBirbService` /
 * `PostyBirbController`) so concrete repositories still satisfy it while
 * keeping this precision at call sites.
 */
export type FindManyConfig<K extends SchemaKey> = DBQueryConfig<
  'many',
  ExtractedRelations,
  ExtractedRelations[K]
>;

/**
 * `findFirst` config — the v2 `one` query config (no `limit`).
 */
export type FindFirstConfig<K extends SchemaKey> = DBQueryConfig<
  'one',
  ExtractedRelations,
  ExtractedRelations[K]
>;

/**
 * A subset of relations to eager-load. Used for `defaultWith` on a
 * repository and for per-call `with` overrides on `find` / `findOne` /
 * `findById`. Extracted from the v2 `with` clause shape.
 */
export type DefaultWithFor<K extends SchemaKey> =
  FindManyConfig<K> extends { with?: infer W } ? W : never;

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
 * Subscriber callback invoked by `SubscriberBus` after write operations.
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
  R extends EntityRepository<any, infer T> ? T : never;

/**
 * Extracts the schema key type from a repository type.
 */
export type RepoSchemaKey<R> =
  R extends EntityRepository<infer K, any> ? K : never;
