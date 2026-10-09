import { Logger } from '@postybirb/logger';
import type { SchemaKey } from '../../helper-types';
import type { EntityRepository } from './entity-repository';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRepo = EntityRepository<SchemaKey, any>;

/**
 * Process-wide registry of repository instances, keyed by `SchemaKey`.
 *
 * Used by `saveFromEntity` to resolve `entity.entitySchemaKey` to the
 * concrete repository at runtime.
 *
 * **First-registration-wins.** Multiple `new XRepository(...)` instances
 * are expected (each consumer constructs its own with its own default
 * load). If `saveFromEntity` could grab a later-registered instance it
 * would depend on NestJS module instantiation order, which is not stable
 * across test/production boots. First-wins gives deterministic routing.
 * Subsequent `register` calls for an already-registered key are logged
 * and ignored.
 *
 * Registration happens automatically in the `EntityRepository` base
 * constructor; subclasses do not call `register` directly.
 */
export class RepositoryRegistry {
  private static readonly logger = Logger('RepositoryRegistry');

  private static readonly map = new Map<SchemaKey, AnyRepo>();

  public static register<K extends SchemaKey>(
    key: K,
    repo: EntityRepository<K, never>,
  ): void {
    if (RepositoryRegistry.map.has(key)) {
      return;
    }
    RepositoryRegistry.map.set(key, repo as unknown as AnyRepo);
  }

  public static get<K extends SchemaKey>(
    key: K,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): EntityRepository<K, any> {
    const repo = RepositoryRegistry.map.get(key);
    if (!repo) {
      throw new Error(
        `No repository registered for schema "${String(key)}". ` +
          `Did you forget to construct ${String(key).replace(
            'Schema',
            '',
          )}Repository before calling saveFromEntity?`,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return repo as EntityRepository<K, any>;
  }

  /**
   * `true` if a repository for `key` has been registered.
   */
  public static has(key: SchemaKey): boolean {
    return RepositoryRegistry.map.has(key);
  }

  /**
   * Remove all registrations. Test helper.
   */
  public static clear(): void {
    RepositoryRegistry.map.clear();
  }
}
