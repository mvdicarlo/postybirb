import type { EntityId, IEntity } from '@postybirb/types';
import { clearDatabase } from '../../database';
import type { SchemaKey } from '../../helper-types';
import { EntityRepository } from './entity-repository';
import { RepositoryRegistry } from './repository-registry';

/**
 * Assert that every key on a row appears on a hydrated entity with the
 * same value. Relation keys (typed as arrays or nested objects) are
 * skipped by default — pass them in `relationKeys` so they can be
 * structurally checked by the caller instead.
 *
 * The helper is intentionally minimal — it exists so per-entity specs
 * can verify every scalar column round-trips without each spec repeating
 * the same loop.
 */
export function assertRowRoundtrips<
  R extends { id: EntityId },
  E extends { id: EntityId } & Record<string, unknown>,
>(
  row: R,
  entity: E,
  relationKeys: readonly (keyof R)[] = [],
): void {
  const skip = new Set<string>(relationKeys.map((k) => String(k)));
  for (const key of Object.keys(row) as Array<keyof R & string>) {
    if (skip.has(key)) continue;
    expect(entity[key as keyof E]).toEqual(row[key]);
  }
}

/**
 * Reset all shared static state held by the repository layer. Always run
 * registry clears before `clearDatabase` so the underlying connection can
 * be dropped cleanly.
 */
export function resetRepositoryState(): void {
  RepositoryRegistry.clear();
  clearDatabase();
}

/**
 * Construct a single repository against a fresh `:memory:` database and
 * register `beforeEach`/`afterEach` hooks to tear down all shared static
 * state (registry, subscriber bus, db) between tests. The migration
 * runner inside `getDatabase()` is what gives us the schema — callers
 * don't need to invoke `migrate` themselves.
 *
 * Usage:
 *
 * ```ts
 * describe('AccountRepository', () => {
 *   const repo = createTestRepository(AccountRepository);
 *   it('inserts a row', async () => { ... });
 * });
 * ```
 *
 * The returned value is a stable proxy that forwards to a freshly-built
 * instance per test, so the reference can be closed over by test bodies.
 */
export function createTestRepository<
  R extends EntityRepository<SchemaKey, IEntity>,
>(Ctor: new () => R): R {
  const ref: { current: R | undefined } = { current: undefined };

  beforeEach(() => {
    resetRepositoryState();
    ref.current = new Ctor();
  });

  afterEach(() => {
    resetRepositoryState();
  });

  return makeRepoProxy(ref, Ctor.name);
}

/**
 * Construct multiple repositories against the same `:memory:` database.
 * Behaves like {@link createTestRepository} but returns each requested
 * repo via a stable proxy and shares a single `beforeEach`/`afterEach`
 * lifecycle.
 *
 * Usage:
 *
 * ```ts
 * const { account, submission } = createTestRepositories({
 *   account: AccountRepository,
 *   submission: SubmissionRepository,
 * });
 * ```
 */
export function createTestRepositories<
  M extends Record<string, new () => EntityRepository<SchemaKey, IEntity>>,
>(ctors: M): { [K in keyof M]: InstanceType<M[K]> } {
  const refs = {} as { [K in keyof M]: { current: InstanceType<M[K]> | undefined } };
  for (const key of Object.keys(ctors) as Array<keyof M>) {
    refs[key] = { current: undefined };
  }

  beforeEach(() => {
    resetRepositoryState();
    for (const key of Object.keys(ctors) as Array<keyof M>) {
      refs[key].current = new ctors[key]() as InstanceType<M[typeof key]>;
    }
  });

  afterEach(() => {
    resetRepositoryState();
  });

  const out = {} as { [K in keyof M]: InstanceType<M[K]> };
  for (const key of Object.keys(ctors) as Array<keyof M & string>) {
    out[key] = makeRepoProxy(refs[key], String(key)) as InstanceType<M[typeof key]>;
  }
  return out;
}

function makeRepoProxy<T extends object>(
  ref: { current: T | undefined },
  label: string,
): T {
  return new Proxy({} as T, {
    get(_t, prop, receiver) {
      if (!ref.current) {
        throw new Error(
          `Test repository "${label}" accessed outside of a test body. ` +
            `The proxy returned by createTestRepository(s) is only valid ` +
            `inside it()/beforeAll/afterAll callbacks.`,
        );
      }
      return Reflect.get(ref.current as object, prop, receiver);
    },
    set(_t, prop, value, receiver) {
      if (!ref.current) return false;
      return Reflect.set(ref.current as object, prop, value, receiver);
    },
    has(_t, prop) {
      return !!ref.current && prop in (ref.current as object);
    },
  });
}
