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
 * Identity dedup is a deliberate behaviour change vs the legacy
 * `class-transformer`-based hydration path, which produced two distinct
 * instances for repeated rows.
 */
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
   * Number of cached instances. Exposed for tests / diagnostics.
   */
  public get size(): number {
    return this.cache.size;
  }

  private static key(schemaKey: SchemaKey, id: EntityId): string {
    return `${String(schemaKey)}:${id}`;
  }
}
