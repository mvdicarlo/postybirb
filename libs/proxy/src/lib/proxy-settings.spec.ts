import {
  buildChromiumProxyBypassRules,
  buildPacProxyDirective,
  buildPacScriptUrl,
  escapePacScriptString,
  parsePacScriptTokenFromUrl,
  resolvePacHttpPort,
} from './proxy-settings';

describe('proxy-settings', () => {
  it('escapes PAC script strings', () => {
    expect(escapePacScriptString('a\\b"c')).toBe('a\\\\b\\"c');
  });

  it('builds a PAC proxy directive for HTTP and SOCKS entries', () => {
    expect(
      buildPacProxyDirective({
        id: 'proxy-1',
        host: 'proxy.example.com',
        port: '8080',
        type: 'http',
        enabled: true,
        username: '',
        password: '',
      }),
    ).toBe('PROXY proxy.example.com:8080');
    expect(
      buildPacProxyDirective({
        id: 'proxy-2',
        host: 'proxy.example.com',
        port: '1080',
        type: 'socks5',
        enabled: true,
        username: '',
        password: '',
      }),
    ).toBe('SOCKS5 proxy.example.com:1080');
  });

  it('builds and parses PAC script URLs', () => {
    expect(
      buildPacScriptUrl(
        { mode: 'pac_routing', pacAccessToken: 'abc123' },
        '3000',
      ),
    ).toBe('http://127.0.0.1:3001/api/proxy/pac/abc123');
    expect(parsePacScriptTokenFromUrl('/api/proxy/pac/abc123')).toBe('abc123');
  });

  it('resolves PAC HTTP port and Chromium bypass rules', () => {
    expect(resolvePacHttpPort('3000')).toBe('3001');
    expect(buildChromiumProxyBypassRules('3000')).toContain('localhost:3000');
  });
});
