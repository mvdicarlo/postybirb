/**
 * Covers the startup half of the posting lock: until crash recovery has
 * reconciled, nothing can be said about any submission, so everything is
 * locked — and it must unlock again no matter how recovery ends.
 */

import { RelayPersistence } from './persistence';
import { RelayPipelineDeps } from './pipeline-deps';
import { RelayPostManager } from './post-manager.service';
import { MemoryRateStore, RateLimiter } from './rate-limiter';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Let the pending .finally() on the recovery promise run. */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setImmediate(r));
  }
}

/**
 * onModuleInit no-ops under jest, so drop the NODE_ENV signal for the duration
 * of the call to exercise the real startup path.
 */
async function startRecovery(manager: RelayPostManager): Promise<void> {
  const nodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await manager.onModuleInit();
  } finally {
    process.env.NODE_ENV = nodeEnv;
  }
}

function makeManager(loadActive: () => Promise<unknown[]>) {
  const deps = {
    rateLimiter: new RateLimiter(new MemoryRateStore()),
    tracer: { pruneOldLogs: jest.fn().mockResolvedValue(0) },
    prepare: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
  } as unknown as RelayPipelineDeps;

  const persistence = {
    loadActive: jest.fn(loadActive),
    failJob: jest.fn().mockResolvedValue(undefined),
  } as unknown as RelayPersistence;

  const registry = {
    waitForInitialization: jest.fn().mockResolvedValue(undefined),
  } as never;

  return new RelayPostManager(deps, persistence, registry);
}

describe('RelayPostManager posting lock', () => {
  it('locks every submission while crash recovery is in flight', async () => {
    const gate = deferred<unknown[]>();
    const manager = makeManager(() => gate.promise);

    expect(manager.isPostingLocked('anything')).toBe(false);

    await startRecovery(manager);
    expect(manager.isPostingLocked('anything')).toBe(true);

    gate.resolve([]);
    await flush();
    expect(manager.isPostingLocked('anything')).toBe(false);
  });

  it('releases the lock when recovery fails', async () => {
    // A recovery that blows up must not leave the app permanently uneditable.
    const gate = deferred<unknown[]>();
    const manager = makeManager(() => gate.promise);

    await startRecovery(manager);
    expect(manager.isPostingLocked('anything')).toBe(true);

    gate.reject(new Error('database is locked'));
    await flush();

    expect(manager.isPostingLocked('anything')).toBe(false);
  });

  it('leaves the lock open for submissions with no active job', async () => {
    const manager = makeManager(async () => []);

    await startRecovery(manager);
    await flush();

    expect(manager.isPostingLocked('idle-submission')).toBe(false);
    expect(manager.isPosting('idle-submission')).toBe(false);
  });
});
