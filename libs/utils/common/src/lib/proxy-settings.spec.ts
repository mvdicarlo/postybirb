import {
  buildProxyAgentUrl,
  buildProxyRules,
  buildSessionProxyRules,
  createProxyAgent,
  isProxiedResolution,
  isProxyConfiguration,
  normalizeProxyProfile,
  shouldBypassProxyForUrl,
} from './proxy-settings';

describe('normalizeProxyProfile', () => {
  it('trims host/port and defaults type to http', () => {
    expect(
      normalizeProxyProfile({
        id: ' profile-1 ',
        enabled: true,
        host: '  proxy.example.com ',
        port: ' 8080 ',
        type: undefined,
        websites: undefined,
      }),
    ).toEqual({
      id: 'profile-1',
      enabled: true,
      label: undefined,
      type: 'http',
      host: 'proxy.example.com',
      port: '8080',
      username: '',
      password: '',
      websites: [],
    });
  });

  it('preserves socks5 type', () => {
    expect(
      normalizeProxyProfile({
        id: 'socks',
        enabled: true,
        type: 'socks5',
        host: '127.0.0.1',
        port: '7890',
        websites: ['pixiv'],
      }).type,
    ).toBe('socks5');
  });
});

describe('buildProxyRules', () => {
  it('builds HTTP CONNECT proxyRules with auth', () => {
    expect(
      buildProxyRules({
        id: 'http-profile',
        enabled: true,
        type: 'http',
        host: 'proxy.example.com',
        port: '8080',
        username: 'user',
        password: 'pass',
        websites: [],
      }),
    ).toBe('http://user:pass@proxy.example.com:8080');
  });

  it('builds SOCKS5 proxyRules without auth', () => {
    expect(
      buildProxyRules({
        id: 'socks-profile',
        enabled: true,
        type: 'socks5',
        host: '127.0.0.1',
        port: '7890',
        username: '',
        password: '',
        websites: ['telegram'],
      }),
    ).toBe('socks5://127.0.0.1:7890');
  });

  it('returns empty string when profile is disabled', () => {
    expect(
      buildProxyRules({
        id: 'disabled',
        enabled: false,
        type: 'http',
        host: 'proxy.example.com',
        port: '8080',
        username: '',
        password: '',
        websites: [],
      }),
    ).toBe('');
  });
});

describe('buildSessionProxyRules', () => {
  it('omits credentials for Electron session.setProxy', () => {
    expect(
      buildSessionProxyRules({
        id: 'http-profile',
        enabled: true,
        type: 'http',
        host: 'proxy.example.com',
        port: '8080',
        username: 'user',
        password: 'pass',
        websites: [],
      }),
    ).toBe('http=proxy.example.com:8080;https=proxy.example.com:8080');
  });
});

describe('buildProxyAgentUrl', () => {
  it('returns null when profile cannot produce rules', () => {
    expect(buildProxyAgentUrl(null)).toBeNull();
  });
});

describe('createProxyAgent', () => {
  it('returns null for disabled profiles', () => {
    expect(
      createProxyAgent(
        {
          id: 'disabled',
          enabled: false,
          type: 'http',
          host: 'proxy.example.com',
          port: '8080',
          username: '',
          password: '',
          websites: [],
        },
        true,
      ),
    ).toBeNull();
  });

  it('creates an agent for enabled HTTP profiles', () => {
    expect(
      createProxyAgent(
        {
          id: 'http-profile',
          enabled: true,
          type: 'http',
          host: 'proxy.example.com',
          port: '8080',
          username: '',
          password: '',
          websites: [],
        },
        true,
      ),
    ).not.toBeNull();
  });
});

describe('isProxiedResolution', () => {
  it('returns false for empty or DIRECT resolutions', () => {
    expect(isProxiedResolution(undefined)).toBe(false);
    expect(isProxiedResolution('')).toBe(false);
    expect(isProxiedResolution('DIRECT')).toBe(false);
  });

  it('returns true when a proxy section is present', () => {
    expect(isProxiedResolution('PROXY 127.0.0.1:8080')).toBe(true);
    expect(isProxiedResolution('DIRECT; PROXY 127.0.0.1:8080')).toBe(true);
    expect(isProxiedResolution('SOCKS5 127.0.0.1:1080')).toBe(true);
  });
});

describe('shouldBypassProxyForUrl', () => {
  it('bypasses loopback hosts', () => {
    expect(shouldBypassProxyForUrl('http://localhost/api')).toBe(true);
    expect(shouldBypassProxyForUrl('http://127.0.0.1/api')).toBe(true);
  });

  it('bypasses localhost with matching app port', () => {
    expect(
      shouldBypassProxyForUrl('http://127.0.0.1:9487/health', {
        appPort: '9487',
      }),
    ).toBe(true);
  });

  it('bypasses explicit remote host matches', () => {
    expect(
      shouldBypassProxyForUrl('https://remote.example.com/ping', {
        remoteHost: 'remote.example.com',
      }),
    ).toBe(true);
    expect(
      shouldBypassProxyForUrl('https://remote.example.com/ping', {
        remoteHost: 'https://remote.example.com:443',
      }),
    ).toBe(true);
  });

  it('does not bypass unrelated hosts', () => {
    expect(shouldBypassProxyForUrl('https://pixiv.net/')).toBe(false);
  });
});

describe('isProxyConfiguration', () => {
  it('accepts v3 configuration shape', () => {
    expect(
      isProxyConfiguration({
        mode: 'system',
        pool: [],
        routing: {},
      }),
    ).toBe(true);
  });

  it('rejects legacy profiles configuration', () => {
    expect(isProxyConfiguration({ profiles: [] })).toBe(false);
  });

  it('rejects invalid flat proxy objects', () => {
    expect(
      isProxyConfiguration({
        enabled: true,
        host: 'proxy.example.com',
        port: '8080',
      }),
    ).toBe(false);
  });
});
