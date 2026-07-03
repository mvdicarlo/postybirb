import { parseProxyResolution, parseProxySection } from './proxy-resolution';

describe('proxy-resolution', () => {
  it('parses proxy sections', () => {
    expect(parseProxySection('HTTP proxy.example.com:8080')).toEqual({
      type: 'HTTP',
      hostname: 'proxy.example.com',
      port: '8080',
    });
  });

  it('parses proxy resolution lists', () => {
    expect(parseProxyResolution('DIRECT;PROXY proxy.example.com:8080')).toEqual([
      {
        type: 'PROXY',
        hostname: 'proxy.example.com',
        port: '8080',
      },
    ]);
  });
});
