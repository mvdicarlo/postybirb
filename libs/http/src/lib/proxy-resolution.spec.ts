import { parseProxyResolution, parseProxySection } from './proxy-resolution';

describe('proxy-resolution', () => {
  it('parses PROXY host:port sections', () => {
    expect(parseProxySection('PROXY 10.0.0.1:8080')).toEqual({
      type: 'PROXY',
      hostname: '10.0.0.1',
      port: '8080',
    });
  });

  it('parses SOCKS5 host:port sections', () => {
    expect(parseProxySection('SOCKS5 127.0.0.1:1080')).toEqual({
      type: 'SOCKS5',
      hostname: '127.0.0.1',
      port: '1080',
    });
  });

  it('returns null for DIRECT', () => {
    expect(parseProxySection('DIRECT')).toBeNull();
  });

  it('splits semicolon-separated resolutions', () => {
    expect(
      parseProxyResolution('PROXY 10.0.0.1:8080; DIRECT; SOCKS5 127.0.0.1:1080'),
    ).toEqual([
      { type: 'PROXY', hostname: '10.0.0.1', port: '8080' },
      { type: 'SOCKS5', hostname: '127.0.0.1', port: '1080' },
    ]);
  });
});
