import {
  clearProxyAuthStore,
  resolveProxyAuthCredentials,
  syncProxyAuthPool,
} from './proxy-auth-store';

describe('proxy-auth-store', () => {
  afterEach(() => {
    clearProxyAuthStore();
  });

  it('stores and resolves proxy auth credentials', () => {
    syncProxyAuthPool([
      {
        type: 'http',
        host: 'proxy.example.com',
        port: '8080',
        enabled: true,
        username: 'user',
        password: 'pass',
      } as never,
    ]);

    expect(
      resolveProxyAuthCredentials({
        isProxy: true,
        host: 'proxy.example.com',
        port: 8080,
      }),
    ).toEqual({
      username: 'user',
      password: 'pass',
    });
  });
});
