import {
  buildPoolKey,
  ProxyAuthStore,
} from './proxy-auth-store';

describe('ProxyAuthStore', () => {
  it('resolves HTTP credentials by type:host:port', () => {
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

  it('ignores SOCKS5 pool entries (host and port only)', () => {
    const store = new ProxyAuthStore();
    store.syncPool([
      {
        id: 'pool-2',
        type: 'socks5',
        host: 'proxy.example.com',
        port: '1080',
        username: 'solo-user',
        password: 'secret',
      },
    ]);

    expect(
      store.resolveForProxyChallenge({
        isProxy: true,
        host: 'proxy.example.com',
        port: 1080,
        scheme: 'socks',
      }),
    ).toBeNull();
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

  it('builds stable pool keys', () => {
    expect(buildPoolKey('http', '10.0.0.5', 9050)).toBe('http:10.0.0.5:9050');
  });
});
