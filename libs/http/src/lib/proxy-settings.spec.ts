import {
  buildChromiumProxyBypassRules,
  buildPacProxyDirective,
  buildPacScriptUrl,
  parsePacScriptTokenFromUrl,
  resolvePacHttpPort,
  shouldBypassProxyForUrl,
} from './proxy-settings';

describe('buildPacProxyDirective', () => {
  it('returns DIRECT when host or port is missing', () => {
    expect(
      buildPacProxyDirective({
        id: 'pool-1',
        type: 'http',
        host: '',
        port: '8080',
        username: '',
        password: '',
      }),
    ).toBe('DIRECT');
  });

  it('builds SOCKS5 and HTTP directives', () => {
    expect(
      buildPacProxyDirective({
        id: 'pool-1',
        type: 'socks5',
        host: '127.0.0.1',
        port: '1080',
        username: '',
        password: '',
      }),
    ).toBe('SOCKS5 127.0.0.1:1080');

    expect(
      buildPacProxyDirective({
        id: 'pool-1',
        type: 'http',
        host: 'proxy.example.com',
        port: '3128',
        username: '',
        password: '',
      }),
    ).toBe('PROXY proxy.example.com:3128');
  });
});

describe('shouldBypassProxyForUrl', () => {
  it('bypasses loopback hosts', () => {
    expect(shouldBypassProxyForUrl('http://127.0.0.1:1234')).toBe(true);
  });
});

describe('buildChromiumProxyBypassRules', () => {
  it('includes loopback hosts and app ports', () => {
    const rules = buildChromiumProxyBypassRules('8080');
    expect(rules).toContain('localhost');
    expect(rules).toContain('127.0.0.1:8080');
  });
});

describe('resolvePacHttpPort', () => {
  it('defaults to main port plus one', () => {
    expect(resolvePacHttpPort('3000')).toBe('3001');
  });
});

describe('buildPacScriptUrl', () => {
  it('uses loopback HTTP on the PAC port', () => {
    expect(
      buildPacScriptUrl(
        { mode: 'pac_routing', pacAccessToken: 'abc' },
        '3000',
      ),
    ).toBe('http://127.0.0.1:3001/api/proxy/pac/abc');
  });
});

describe('parsePacScriptTokenFromUrl', () => {
  it('extracts the token from a PAC request path', () => {
    expect(parsePacScriptTokenFromUrl('/api/proxy/pac/abc%20123?x=1')).toBe(
      'abc 123',
    );
  });

  it('returns null for unrelated paths', () => {
    expect(parsePacScriptTokenFromUrl('/api/other')).toBeNull();
  });
});
