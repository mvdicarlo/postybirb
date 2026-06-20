import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { StartupOptions, StartupOptionsStore } from './startup-options';

let tmpDir: string;
let store: StartupOptionsStore;

const DEFAULTS: StartupOptions = {
  startAppOnSystemStartup: false,
  spellchecker: true,
  appDataPath: '/default/path',
  port: '9487',
  proxy: { profiles: [] },
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

  it('replaces profiles array when proxy.profiles is provided', () => {
    const firstProfile = {
      id: 'profile-1',
      enabled: true,
      type: 'http' as const,
      host: '10.0.0.1',
      port: '8080',
      username: 'user',
      password: 'secret',
      websites: ['pixiv' as const],
    };

    store.set({
      proxy: {
        profiles: [firstProfile],
      },
    });

    store.set({
      proxy: {
        profiles: [
          {
            ...firstProfile,
            enabled: false,
          },
        ],
      },
    });

    const opts = store.get();
    expect(opts.proxy).toEqual({
      profiles: [
        {
          ...firstProfile,
          enabled: false,
        },
      ],
    });

    const raw = JSON.parse(readFileSync(join(tmpDir, 'startup.json'), 'utf-8'));
    expect(raw.proxy).toEqual(opts.proxy);
  });

  it('defaults invalid flat proxy on disk to empty profiles', () => {
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
    expect(s.get().proxy).toEqual({
      profiles: [],
    });
  });

  it('normalizes proxy profiles when loading from disk', () => {
    const path = join(tmpDir, 'startup.json');
    writeFileSync(
      path,
      JSON.stringify({
        proxy: {
          profiles: [
            {
              id: ' profile-1 ',
              enabled: true,
              type: 'http',
              host: '  proxy.example.com ',
              port: ' 3128 ',
              username: ' user ',
              password: 'secret',
              websites: ['discord'],
            },
          ],
        },
      }),
    );
    const s = makeStore();
    expect(s.get().proxy).toEqual({
      profiles: [
        {
          id: 'profile-1',
          enabled: true,
          label: undefined,
          type: 'http',
          host: 'proxy.example.com',
          port: '3128',
          username: 'user',
          password: 'secret',
          websites: ['discord'],
        },
      ],
    });
  });

  it('loads valid proxy configuration from disk', () => {
    const path = join(tmpDir, 'startup.json');
    writeFileSync(
      path,
      JSON.stringify({
        proxy: {
          profiles: [
            {
              id: 'profile-1',
              enabled: true,
              type: 'http',
              host: 'proxy.example.com',
              port: '3128',
              username: '',
              password: '',
              websites: ['discord'],
            },
          ],
        },
      }),
    );
    const s = makeStore();
    expect(s.get().proxy).toMatchObject({
      profiles: [
        expect.objectContaining({
          host: 'proxy.example.com',
          port: '3128',
        }),
      ],
    });
  });

  it('returns a deep copy of proxy profiles — mutations do not affect stored state', () => {
    store.set({
      proxy: {
        profiles: [
          {
            id: 'profile-1',
            enabled: false,
            type: 'http',
            host: '',
            port: '',
            username: '',
            password: '',
            websites: [],
          },
        ],
      },
    });

    const opts = store.get();
    opts.proxy.profiles[0].enabled = true;
    expect(store.get().proxy.profiles[0].enabled).toBe(false);
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
