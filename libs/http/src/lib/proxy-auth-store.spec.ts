import {
  buildPoolKey,
  ProxyAuthStore,
} from './proxy-auth-store';

describe('ProxyAuthStore', () => {
  it('resolves credentials by type:host:port', () => {
    const store = new ProxyAuthStore();
    store.syncPool([
      {
        id: 'pool-1',
        type: 'http',
        host: '127.0.0.1',
        port: '8080',
        username: 'user',
        password: 'secret',
      },
    ]);

    expect(
      store.resolveForProxyChallenge({
        isProxy: true,
        host: '127.0.0.1',
        port: 8080,
      }),
    ).toEqual({
      username: 'user',
      password: 'secret',
    });
  });

  it('supports username-only pool entries', () => {
    const store = new ProxyAuthStore();
    store.syncPool([
      {
        id: 'pool-2',
        type: 'socks5',
        host: 'proxy.example.com',
        port: '1080',
        username: 'solo-user',
        password: '',
      },
    ]);

    expect(
      store.resolveForProxyChallenge({
        isProxy: true,
        host: 'proxy.example.com',
        port: 1080,
        scheme: 'socks',
      }),
    ).toEqual({
      username: 'solo-user',
      password: '',
    });
  });

  it('matches either http or socks5 pool key for the same endpoint', () => {
    const store = new ProxyAuthStore();
    store.syncPool([
      {
        id: 'pool-3',
        type: 'socks5',
        host: '10.0.0.5',
        port: '9050',
        username: 'u',
        password: 'p',
      },
    ]);

    expect(buildPoolKey('socks5', '10.0.0.5', 9050)).toBe('socks5:10.0.0.5:9050');
    expect(
      store.resolveForProxyChallenge({
        isProxy: true,
        host: '10.0.0.5',
        port: 9050,
      }),
    ).toEqual({ username: 'u', password: 'p' });
  });

  it('returns null for non-proxy challenges', () => {
    const store = new ProxyAuthStore();
    store.syncPool([
      {
        id: 'pool-4',
        type: 'http',
        host: '127.0.0.1',
        port: '8080',
        username: 'user',
        password: 'secret',
      },
    ]);

    expect(
      store.resolveForProxyChallenge({
        isProxy: false,
        host: '127.0.0.1',
        port: 8080,
      }),
    ).toBeNull();
  });

  it('clears credentials on syncPool replacement', () => {
    const store = new ProxyAuthStore();
    store.syncPool([
      {
        id: 'old',
        type: 'http',
        host: '1.2.3.4',
        port: '8080',
        username: 'old-user',
        password: 'old-pass',
      },
    ]);

    store.syncPool([]);

    expect(
      store.resolveForProxyChallenge({
        isProxy: true,
        host: '1.2.3.4',
        port: 8080,
      }),
    ).toBeNull();
  });
});
