import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { StartupOptions, StartupOptionsStore } from './startup-options';
import { defaultProxyConfiguration } from './proxy-settings';

let tmpDir: string;
let store: StartupOptionsStore;

const DEFAULTS: StartupOptions = {
  startAppOnSystemStartup: false,
  spellchecker: true,
  appDataPath: '/default/path',
  port: '9487',
  proxy: defaultProxyConfiguration(),
};

function makeStore(overrides: Partial<typeof DEFAULTS> = {}): StartupOptionsStore {
  const s = new StartupOptionsStore();
  s.configure({
    storagePath: join(tmpDir, 'startup.json'),
    defaultAppDataPath: overrides.appDataPath ?? DEFAULTS.appDataPath,
  });
  return s;
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'postybirb-startup-opts-test-'));
  store = makeStore();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('StartupOptionsStore — configuration guard', () => {
  it('get() throws when not configured', () => {
    const s = new StartupOptionsStore();
    expect(() => s.get()).toThrow('StartupOptionsManager.configure()');
  });

  it('set() throws when not configured', () => {
    const s = new StartupOptionsStore();
    expect(() => s.set({ port: '1234' })).toThrow(
      'StartupOptionsManager.configure()',
    );
  });
});

describe('StartupOptionsStore — configure()', () => {
  it('accepts storagePath and defaultAppDataPath', () => {
    expect(() => store.get()).not.toThrow();
  });

  it('reconfiguring resets current state so new defaults take effect', () => {
    store.get(); // prime
    store.configure({
      storagePath: join(tmpDir, 'startup2.json'),
      defaultAppDataPath: '/new/default',
    });
    expect(store.get().appDataPath).toBe('/new/default');
  });
});

describe('StartupOptionsStore — get()', () => {
  it('returns defaults when no file exists', () => {
    const opts = store.get();
    expect(opts).toMatchObject({
      startAppOnSystemStartup: false,
      spellchecker: true,
      port: '9487',
      appDataPath: DEFAULTS.appDataPath,
    });
  });

  it('creates the storage file on first access', () => {
    const path = join(tmpDir, 'startup.json');
    store.get();
    const raw = JSON.parse(readFileSync(path, 'utf-8'));
    expect(raw).toBeDefined();
  });

  it('reads persisted values from disk', () => {
    const path = join(tmpDir, 'startup.json');
    writeFileSync(
      path,
      JSON.stringify({ port: '8080', spellchecker: false }),
    );
    const s = makeStore();
    const opts = s.get();
    expect(opts.port).toBe('8080');
    expect(opts.spellchecker).toBe(false);
  });

  it('merges partial disk data with defaults', () => {
    const path = join(tmpDir, 'startup.json');
    writeFileSync(path, JSON.stringify({ port: '7777' }));
    const s = makeStore();
    const opts = s.get();
    expect(opts.port).toBe('7777');
    expect(opts.spellchecker).toBe(true); // default preserved
    expect(opts.startAppOnSystemStartup).toBe(false);
  });

  it('falls back to defaults when file contains invalid JSON', () => {
    const path = join(tmpDir, 'startup.json');
    writeFileSync(path, 'NOT VALID JSON{{{');
    const s = makeStore();
    expect(() => s.get()).not.toThrow();
    expect(s.get().port).toBe('9487');
  });

  it('returns a copy — mutations do not affect stored state', () => {
    const opts = store.get();
    opts.port = '0000';
    expect(store.get().port).toBe('9487');
  });
});

describe('StartupOptionsStore — set()', () => {
  it('updates the in-memory value immediately', () => {
    store.set({ port: '5555' });
    expect(store.get().port).toBe('5555');
  });

  it('persists changes to disk', () => {
    store.set({ spellchecker: false });
    const raw = JSON.parse(readFileSync(join(tmpDir, 'startup.json'), 'utf-8'));
    expect(raw.spellchecker).toBe(false);
  });

  it('does a partial update — unspecified fields are preserved', () => {
    store.set({ port: '4444' });
    store.set({ spellchecker: false });
    const opts = store.get();
    expect(opts.port).toBe('4444');
    expect(opts.spellchecker).toBe(false);
  });

  it('replaces pool when proxy.pool is provided', () => {
    const firstEntry = {
      id: 'pool-1',
      type: 'http' as const,
      host: '10.0.0.1',
      port: '8080',
      username: 'user',
      password: 'secret',
    };

    store.set({
      proxy: {
        mode: 'fixed_servers',
        pool: [firstEntry],
        fixedProxyId: 'pool-1',
        routing: {},
      },
    });

    store.set({
      proxy: {
        pool: [
          {
            ...firstEntry,
            host: '10.0.0.2',
          },
        ],
      },
    });

    const opts = store.get();
    expect(opts.proxy.pool).toEqual([
      {
        ...firstEntry,
        host: '10.0.0.2',
      },
    ]);

    const raw = JSON.parse(readFileSync(join(tmpDir, 'startup.json'), 'utf-8'));
    expect(raw.proxy.pool).toEqual(opts.proxy.pool);
  });

  it('defaults invalid flat proxy on disk to system mode', () => {
    const path = join(tmpDir, 'startup.json');
    writeFileSync(
      path,
      JSON.stringify({
        proxy: {
          enabled: true,
          host: 'proxy.example.com',
          port: '3128',
        },
      }),
    );
    const s = makeStore();
    expect(s.get().proxy).toEqual(defaultProxyConfiguration());
  });

  it('defaults invalid proxy shapes on disk to system mode', () => {
    const path = join(tmpDir, 'startup.json');
    writeFileSync(
      path,
      JSON.stringify({
        proxy: {
          profiles: [
            {
              id: 'legacy',
              enabled: true,
              type: 'http',
              host: '127.0.0.1',
              port: '8080',
              username: '',
              password: '',
              websites: [],
            },
          ],
        },
      }),
    );
    const s = makeStore();
    expect(s.get().proxy).toEqual(defaultProxyConfiguration());
  });

  it('normalizes proxy configuration when loading from disk', () => {
    const path = join(tmpDir, 'startup.json');
    writeFileSync(
      path,
      JSON.stringify({
        proxy: {
          mode: 'pac_routing',
          pool: [
            {
              id: ' pool-1 ',
              type: 'http',
              host: '  proxy.example.com ',
              port: ' 3128 ',
              username: ' user ',
              password: 'secret',
            },
          ],
          routing: { discord: ' pool-1 ' },
        },
      }),
    );
    const s = makeStore();
    expect(s.get().proxy).toEqual({
      mode: 'pac_routing',
      pool: [
        {
          id: 'pool-1',
          label: undefined,
          type: 'http',
          host: 'proxy.example.com',
          port: '3128',
          username: 'user',
          password: 'secret',
        },
      ],
      fixedProxyId: undefined,
      routing: { discord: ' pool-1 ' },
      pacAccessToken: undefined,
    });
  });

  it('loads valid proxy configuration from disk', () => {
    const path = join(tmpDir, 'startup.json');
    writeFileSync(
      path,
      JSON.stringify({
        proxy: {
          mode: 'fixed_servers',
          pool: [
            {
              id: 'pool-1',
              type: 'http',
              host: 'proxy.example.com',
              port: '3128',
              username: '',
              password: '',
            },
          ],
          fixedProxyId: 'pool-1',
          routing: {},
        },
      }),
    );
    const s = makeStore();
    expect(s.get().proxy).toMatchObject({
      mode: 'fixed_servers',
      pool: [
        expect.objectContaining({
          host: 'proxy.example.com',
          port: '3128',
        }),
      ],
    });
  });

  it('returns a deep copy of proxy pool — mutations do not affect stored state', () => {
    store.set({
      proxy: {
        mode: 'fixed_servers',
        pool: [
          {
            id: 'pool-1',
            type: 'http',
            host: '127.0.0.1',
            port: '8080',
            username: '',
            password: '',
          },
        ],
        fixedProxyId: 'pool-1',
        routing: {},
      },
    });

    const opts = store.get();
    opts.proxy.pool[0].host = '10.0.0.99';
    expect(store.get().proxy.pool[0].host).toBe('127.0.0.1');
  });
});

describe('StartupOptionsStore — onUpdate()', () => {
  it('calls the listener after set()', () => {
    const listener = jest.fn();
    store.onUpdate(listener);
    store.set({ port: '1111' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ port: '1111' }));
  });

  it('calls all registered listeners', () => {
    const a = jest.fn();
    const b = jest.fn();
    store.onUpdate(a);
    store.onUpdate(b);
    store.set({ port: '2222' });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('does not register the same listener twice', () => {
    const listener = jest.fn();
    store.onUpdate(listener);
    store.onUpdate(listener);
    store.set({ port: '3333' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('each set() delivers a fresh snapshot to the listener', () => {
    const received: StartupOptions[] = [];
    store.onUpdate((opts) => received.push({ ...opts }));
    store.set({ port: '6666' });
    store.set({ port: '7777' });
    expect(received[0].port).toBe('6666');
    expect(received[1].port).toBe('7777');
  });
});
