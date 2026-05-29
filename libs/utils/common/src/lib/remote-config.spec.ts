import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { RemoteConfigStore } from './remote-config';

let tmpDir: string;
let store: RemoteConfigStore;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'postybirb-remote-config-test-'));
  store = new RemoteConfigStore();
});

afterEach(() => {
  store.dispose();
  rmSync(tmpDir, { recursive: true, force: true });
  jest.useRealTimers();
});

describe('RemoteConfigStore — configuration guard', () => {
  it('get() rejects when not configured', async () => {
    await expect(store.get()).rejects.toThrow(
      'RemoteConfigManager.configure()',
    );
  });

  it('getSync() returns null and logs when not configured', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = store.getSync();
    expect(result).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('RemoteConfigStore — configure()', () => {
  it('accepts a storagePath and allows subsequent reads', async () => {
    store.configure({ storagePath: join(tmpDir, 'remote-config.json') });
    const config = await store.get();
    expect(config).toMatchObject({ enabled: expect.any(Boolean), password: expect.any(String) });
  });

  it('can be reconfigured with a new path', async () => {
    const path1 = join(tmpDir, 'config1.json');
    const path2 = join(tmpDir, 'config2.json');
    writeFileSync(path1, JSON.stringify({ password: 'aaa', enabled: true }));
    writeFileSync(path2, JSON.stringify({ password: 'bbb', enabled: false }));

    store.configure({ storagePath: path1 });
    expect((await store.get()).password).toBe('aaa');

    store.dispose();
    store.configure({ storagePath: path2 });
    expect((await store.get()).password).toBe('bbb');
  });
});

describe('RemoteConfigStore — get()', () => {
  const storagePath = () => join(tmpDir, 'remote-config.json');

  it('creates the config file when it does not exist', async () => {
    store.configure({ storagePath: storagePath() });
    const config = await store.get();
    const raw = JSON.parse(readFileSync(storagePath(), 'utf-8'));
    expect(raw).toEqual(config);
  });

  it('generates a UUID password on creation', async () => {
    store.configure({ storagePath: storagePath() });
    const config = await store.get();
    expect(config.password).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('reads an existing config from disk', async () => {
    writeFileSync(
      storagePath(),
      JSON.stringify({ password: 'secret', enabled: false }),
    );
    store.configure({ storagePath: storagePath() });
    const config = await store.get();
    expect(config).toEqual({ password: 'secret', enabled: false });
  });

  it('returns cached value on subsequent calls without re-reading disk', async () => {
    store.configure({ storagePath: storagePath() });
    const first = await store.get();

    // Overwrite the file; a cached store must not notice
    writeFileSync(storagePath(), JSON.stringify({ password: 'changed', enabled: true }));
    const second = await store.get();

    expect(second).toEqual(first);
  });
});

describe('RemoteConfigStore — getSync()', () => {
  const storagePath = () => join(tmpDir, 'remote-config.json');

  it('creates the config file when it does not exist', () => {
    store.configure({ storagePath: storagePath() });
    const config = store.getSync();
    expect(config).not.toBeNull();
    const raw = JSON.parse(readFileSync(storagePath(), 'utf-8'));
    expect(raw).toEqual(config);
  });

  it('reads an existing config from disk', () => {
    writeFileSync(
      storagePath(),
      JSON.stringify({ password: 'sync-secret', enabled: true }),
    );
    store.configure({ storagePath: storagePath() });
    expect(store.getSync()).toEqual({ password: 'sync-secret', enabled: true });
  });

  it('returns cached value on subsequent calls', () => {
    store.configure({ storagePath: storagePath() });
    const first = store.getSync();
    writeFileSync(storagePath(), JSON.stringify({ password: 'changed', enabled: true }));
    expect(store.getSync()).toEqual(first);
  });
});

describe('RemoteConfigStore — dispose()', () => {
  it('clears the cache so the next read hits disk', async () => {
    const path = join(tmpDir, 'remote-config.json');
    writeFileSync(path, JSON.stringify({ password: 'original', enabled: true }));
    store.configure({ storagePath: path });

    await store.get(); // primes the cache
    writeFileSync(path, JSON.stringify({ password: 'updated', enabled: false }));

    store.dispose();
    const config = await store.get();
    expect(config).toEqual({ password: 'updated', enabled: false });
  });
});
