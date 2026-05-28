import type { SchemaKey } from '../../helper-types';
import type { EntityRepository } from './entity-repository';
import { RepositoryRegistry } from './repository-registry';

// Lightweight fake — RepositoryRegistry stores instances opaquely and tests
// only need identity equality. Avoids spinning up an in-memory db just to
// exercise registration/lookup semantics. The full EntityRepository
// integration spec lives in Phase C.
function makeFakeRepo<K extends SchemaKey>(key: K) {
  return { schemaKey: key, marker: Symbol(`fake-${String(key)}`) } as unknown as
    EntityRepository<K, never>;
}

describe('RepositoryRegistry', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    RepositoryRegistry.clear();
    // Logger() goes through @postybirb/logger; spy on console.warn as a
    // proxy for any warning channel the logger eventually writes to.
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    RepositoryRegistry.clear();
  });

  it('round-trips register and get', () => {
    const repo = makeFakeRepo('AccountSchema');
    RepositoryRegistry.register('AccountSchema', repo);
    expect(RepositoryRegistry.get('AccountSchema')).toBe(repo);
  });

  it('has() reports registration state', () => {
    expect(RepositoryRegistry.has('AccountSchema')).toBe(false);
    RepositoryRegistry.register('AccountSchema', makeFakeRepo('AccountSchema'));
    expect(RepositoryRegistry.has('AccountSchema')).toBe(true);
  });

  it('first registration wins — second register call is ignored and returns the original', () => {
    const first = makeFakeRepo('AccountSchema');
    const second = makeFakeRepo('AccountSchema');
    RepositoryRegistry.register('AccountSchema', first);
    RepositoryRegistry.register('AccountSchema', second);
    expect(RepositoryRegistry.get('AccountSchema')).toBe(first);
    expect(RepositoryRegistry.get('AccountSchema')).not.toBe(second);
  });

  it('get for an unregistered key throws a clear error', () => {
    expect(() => RepositoryRegistry.get('AccountSchema')).toThrow(
      /No repository registered for schema "AccountSchema"/,
    );
  });

  it('clear() empties the registry', () => {
    RepositoryRegistry.register('AccountSchema', makeFakeRepo('AccountSchema'));
    RepositoryRegistry.register(
      'SubmissionSchema',
      makeFakeRepo('SubmissionSchema'),
    );
    RepositoryRegistry.clear();
    expect(RepositoryRegistry.has('AccountSchema')).toBe(false);
    expect(RepositoryRegistry.has('SubmissionSchema')).toBe(false);
  });

  it('different schema keys are independent', () => {
    const acct = makeFakeRepo('AccountSchema');
    const sub = makeFakeRepo('SubmissionSchema');
    RepositoryRegistry.register('AccountSchema', acct);
    RepositoryRegistry.register('SubmissionSchema', sub);
    expect(RepositoryRegistry.get('AccountSchema')).toBe(acct);
    expect(RepositoryRegistry.get('SubmissionSchema')).toBe(sub);
  });
});
