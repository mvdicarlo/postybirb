import type { EntityId } from '@postybirb/types';
import type { SchemaKey } from '../../helper-types';

/**
 * Per-call hydration cache. Ensures every `(schemaKey, id)` pair maps to a
 * single entity instance for the duration of one top-level repository call,
 * so:
 *
 *  - The same row appearing twice in a `findMany` result yields the same
 *    instance (identity dedup).
 *  - Back-references in a `with` clause (e.g. a child's `parent` relation
 *    pointing at the parent that is currently being constructed) resolve
 *    to the cached parent shell rather than infinite-recursing.
 *
 * Contexts are NOT reused across repository calls. Two sequential
 * `repo.findById(x)` calls produce entities that do NOT share identity,
 * even when they describe the same row — separate fetches return separate
 * snapshots. Callers needing identity across multiple calls must pass a
 * shared `HydrationContext` explicitly to the entity's static `fromRow`.
 *
 * Identity dedup is a deliberate behaviour choice: the same row appearing
 * twice in a `findMany` result yields the same entity instance. Two
 * sequential `repo.findById(x)` calls produce entities that do NOT share
 * identity — separate fetches return separate snapshots.
 */
/**
 * Minimal structural shape of an entity class as far as the hydration
 * context is concerned: a static `fromRow` factory that takes a row and
 * a context. Used by `hydrateOne` / `hydrateMany` so callers pass the
 * class itself rather than re-typing `(r) => X.fromRow(r, ctx)`.
 */
export interface FromRowable<R extends { id: EntityId }, E> {
  fromRow(row: R, ctx: HydrationContext): E;
}

export class HydrationContext {
  private readonly cache = new Map<string, unknown>();

  /**
   * Resolve `(schemaKey, id)` to an entity, constructing it if not yet
   * cached.
   *
   * Critical: the freshly constructed instance is inserted into the cache
   * BEFORE `populate` runs. This lets `populate` recurse into relations
   * whose nested rows reference back to this same `(schemaKey, id)` and
   * have them collapse to the in-construction shell instead of building a
   * new one.
   */
  public getOrCreate<T>(
    schemaKey: SchemaKey,
    id: EntityId,
    construct: () => T,
    populate?: (instance: T) => void,
  ): T {
    const cacheKey = HydrationContext.key(schemaKey, id);
    const hit = this.cache.get(cacheKey) as T | undefined;
    if (hit !== undefined) {
      return hit;
    }
    const instance = construct();
    // Register the shell before recursing into populate so back-references
    // resolve to this same instance rather than triggering re-construction.
    this.cache.set(cacheKey, instance);
    if (populate) {
      populate(instance);
    }
    return instance;
  }

  /**
   * Sugar over `getOrCreate` for the common case where the construct
   * step is just `new EntityClass(row)`. Use this in entity `fromRow`
   * factories to keep the call site to a single line plus the relation
   * populator.
   *
   * Example:
   * ```ts
   * return ctx.hydrate('AccountSchema', row, Account, (e) => {
   *   if (row.websiteData) e.websiteData = ctx.hydrateOne(WebsiteData, row.websiteData);
   * });
   * ```
   */
  public hydrate<E>(
    schemaKey: SchemaKey,
    row: { id: EntityId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EntityClass: new (init: any) => E,
    populate?: (instance: E) => void,
  ): E {
    return this.getOrCreate(
      schemaKey,
      row.id,
      () => new EntityClass(row),
      populate,
    );
  }

  /**
   * Hydrate a single eager-loaded relation row through the same context.
   * Caller is responsible for the `if (row.relation)` guard — this helper
   * exists purely to drop the repeated `EntityClass.fromRow(r, ctx)` form.
   */
  public hydrateOne<R extends { id: EntityId }, E>(
    EntityClass: FromRowable<R, E>,
    row: R,
  ): E {
    return EntityClass.fromRow(row, this);
  }

  /**
   * Hydrate an array of eager-loaded relation rows through the same
   * context. Caller is responsible for the `if (row.relation)` guard.
   */
  public hydrateMany<R extends { id: EntityId }, E>(
    EntityClass: FromRowable<R, E>,
    rows: readonly R[],
  ): E[] {
    return rows.map((r) => EntityClass.fromRow(r, this));
  }

  /**
   * Number of cached instances. Exposed for tests / diagnostics.
   */
  public get size(): number {
    return this.cache.size;
  }

  private static key(schemaKey: SchemaKey, id: EntityId): string {
    return `${String(schemaKey)}:${id}`;
  }
}
