import {
  buildChromiumProxyBypassRules,
  buildPacScriptUrl,
  buildProxyAgentUrl,
  buildProxyRules,
  buildSessionProxyRules,
  createProxyAgent,
  isProxiedResolution,
  isProxyConfiguration,
  prepareProxyConfiguration,
  parsePacScriptTokenFromUrl,
  resolvePacHttpPort,
  shouldBypassProxyForUrl,
  toEnabledProxyProfile,
  validateProxyConfiguration,
} from './proxy-settings';

describe('toEnabledProxyProfile', () => {
  it('marks pool entries as enabled', () => {
    expect(
      toEnabledProxyProfile({
        id: 'pool-1',
        type: 'http',
        host: 'proxy.example.com',
        port: '8080',
        username: '',
        password: '',
      }),
    ).toEqual({
      id: 'pool-1',
      type: 'http',
      host: 'proxy.example.com',
      port: '8080',
      username: '',
      password: '',
      enabled: true,
    });
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
      }),
    ).toBe('socks5://127.0.0.1:7890');
  });

  it('ignores SOCKS5 credentials even when present', () => {
    expect(
      buildProxyRules({
        id: 'socks-profile',
        enabled: true,
        type: 'socks5',
        host: '127.0.0.1',
        port: '7890',
        username: 'user',
        password: 'pass',
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

  it('bypasses the configured cloud API host', () => {
    const previous = process.env.POSTYBIRB_CLOUD_URL;
    process.env.POSTYBIRB_CLOUD_URL =
      'https://postybirb.azurewebsites.net/api';

    expect(
      shouldBypassProxyForUrl('https://postybirb.azurewebsites.net/api/upload'),
    ).toBe(true);

    if (previous === undefined) {
      delete process.env.POSTYBIRB_CLOUD_URL;
    } else {
      process.env.POSTYBIRB_CLOUD_URL = previous;
    }
  });
});

describe('isProxyConfiguration', () => {
  it('accepts configuration shape', () => {
    expect(
      isProxyConfiguration({
        mode: 'system',
        pool: [],
        routing: {},
      }),
    ).toBe(true);
  });

  it('rejects profiles-only configuration', () => {
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

describe('validateProxyConfiguration', () => {
  it('uses human-readable pool entry names in errors', () => {
    const result = validateProxyConfiguration({
      mode: 'fixed_servers',
      pool: [
        {
          id: '5469b6c4-73b3-4eba-bf7b-b9c0e0e3cb1c',
          type: 'http',
          host: '',
          port: '',
          username: '',
          password: '',
        },
      ],
      routing: {},
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      'Proxy 1: Host is required.',
      'Proxy 1: Port must be a number between 1 and 65535.',
      'Select a proxy for all traffic.',
    ]);
  });

  it('uses website display names for routing errors', () => {
    const result = validateProxyConfiguration(
      {
        mode: 'pac_routing',
        pool: [
          {
            id: 'pool-1',
            type: 'http',
            host: 'proxy.example.com',
            port: '8080',
            username: '',
            password: '',
          },
        ],
        routing: {
          instagram: 'missing-pool-id',
        },
      },
      {
        websiteDisplayNames: {
          instagram: 'Instagram',
        },
      },
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      'Instagram: Selected proxy is missing from the pool.',
    ]);
  });

  it('ignores stale per-website routing when mode is fixed_servers', () => {
    const result = validateProxyConfiguration({
      mode: 'fixed_servers',
      fixedProxyId: 'pool-1',
      pool: [
        {
          id: 'pool-1',
          type: 'http',
          host: 'proxy.example.com',
          port: '8080',
          username: '',
          password: '',
        },
      ],
      routing: {
        instagram: 'missing-pool-id',
      },
    });

    expect(result.ok).toBe(true);
  });
});

describe('prepareProxyConfiguration', () => {
  it('clears PAC routing state when switching to fixed_servers', () => {
    expect(
      prepareProxyConfiguration({
        mode: 'fixed_servers',
        pool: [
          {
            id: 'pool-1',
            type: 'http',
            host: 'proxy.example.com',
            port: '8080',
            username: '',
            password: '',
          },
        ],
        routing: { instagram: 'pool-1' },
        pacAccessToken: 'stale-token',
      }),
    ).toEqual({
      mode: 'fixed_servers',
      pool: [
        {
          id: 'pool-1',
          label: undefined,
          type: 'http',
          host: 'proxy.example.com',
          port: '8080',
          username: '',
          password: '',
        },
      ],
      fixedProxyId: 'pool-1',
      routing: {},
      pacAccessToken: undefined,
    });
  });

  it('infers fixedProxyId from a single routed pool entry', () => {
    expect(
      prepareProxyConfiguration({
        mode: 'fixed_servers',
        pool: [
          {
            id: 'pool-1',
            type: 'http',
            host: 'proxy.example.com',
            port: '8080',
            username: '',
            password: '',
          },
        ],
        routing: { instagram: 'pool-1' },
      }).fixedProxyId,
    ).toBe('pool-1');
  });
});

describe('buildChromiumProxyBypassRules', () => {
  it('includes loopback hosts, the app port, and the PAC HTTP port', () => {
    expect(buildChromiumProxyBypassRules('9487')).toContain(
      'localhost:9487',
    );
    expect(buildChromiumProxyBypassRules('9487')).toContain(
      'localhost:9488',
    );
    expect(buildChromiumProxyBypassRules('9487')).toContain(
      '<-loopback>',
    );
  });
});

describe('resolvePacHttpPort', () => {
  it('defaults to main port plus one', () => {
    expect(resolvePacHttpPort('9487')).toBe('9488');
  });
});

describe('buildPacScriptUrl', () => {
  it('uses loopback HTTP on the PAC port', () => {
    expect(
      buildPacScriptUrl(
        { mode: 'pac_routing', pacAccessToken: 'abc' },
        '9487',
      ),
    ).toBe('http://127.0.0.1:9488/api/proxy/pac/abc');
  });
});

describe('parsePacScriptTokenFromUrl', () => {
  it('extracts the token from a PAC request path', () => {
    expect(parsePacScriptTokenFromUrl('/api/proxy/pac/secret-token')).toBe(
      'secret-token',
    );
    expect(
      parsePacScriptTokenFromUrl('/api/proxy/pac/secret-token?cache=bust'),
    ).toBe('secret-token');
  });

  it('returns null for unrelated paths', () => {
    expect(parsePacScriptTokenFromUrl('/api/proxy/pool')).toBeNull();
    expect(parsePacScriptTokenFromUrl('/api/proxy/pac/')).toBeNull();
  });
});
