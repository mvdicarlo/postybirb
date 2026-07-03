import {
  buildProxyRules,
  buildSessionProxyRules,
} from './proxy';

describe('proxy', () => {
  it('builds proxy rules', () => {
    expect(
      buildProxyRules({
        id: 'proxy-1',
        host: 'proxy.example.com',
        port: '8080',
        type: 'http',
        enabled: true,
        username: 'user',
        password: 'pass',
      }),
    ).toContain('proxy.example.com');
  });

  it('builds session proxy rules', () => {
    expect(
      buildSessionProxyRules({
        id: 'proxy-2',
        host: 'proxy.example.com',
        port: '8080',
        type: 'http',
        enabled: true,
        username: 'user',
        password: 'pass',
      }),
    ).toContain('http=proxy.example.com:8080');
  });
});
