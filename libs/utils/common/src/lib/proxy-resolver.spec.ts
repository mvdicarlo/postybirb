import {
  resolveProfileForWebsite,
  validateProfiles,
} from './proxy-resolver';
import { ProxyProfile } from './proxy-settings';

describe('validateProfiles', () => {
  const baseProfile = (
    overrides: Partial<ProxyProfile> = {},
  ): ProxyProfile => ({
    id: 'profile-1',
    enabled: true,
    type: 'http',
    host: 'proxy.example.com',
    port: '8080',
    username: '',
    password: '',
    websites: [],
    ...overrides,
  });

  it('accepts valid profiles', () => {
    expect(
      validateProfiles([
        baseProfile({ websites: ['pixiv'] }),
        baseProfile({
          id: 'profile-2',
          websites: ['discord'],
        }),
      ]).ok,
    ).toBe(true);
  });

  it('rejects duplicate website assignments', () => {
    const result = validateProfiles([
      baseProfile({ websites: ['pixiv'] }),
      baseProfile({
        id: 'profile-2',
        websites: ['pixiv'],
      }),
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('pixiv');
  });

  it('requires host and valid port for enabled profiles', () => {
    const result = validateProfiles([
      baseProfile({
        host: '',
        port: '99999',
      }),
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('rejects multiple enabled all-websites profiles', () => {
    const result = validateProfiles([
      baseProfile({ id: 'profile-1', websites: [] }),
      baseProfile({ id: 'profile-2', websites: [] }),
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('all websites');
  });
});

describe('resolveProfileForWebsite', () => {
  it('returns enabled profile assigned to website', () => {
    const profile = resolveProfileForWebsite('pixiv', {
      profiles: [
        {
          id: 'profile-1',
          enabled: true,
          type: 'http',
          host: 'proxy.example.com',
          port: '8080',
          username: '',
          password: '',
          websites: ['pixiv'],
        },
      ],
    });

    expect(profile?.id).toBe('profile-1');
  });

  it('returns null for disabled profiles', () => {
    const profile = resolveProfileForWebsite('pixiv', {
      profiles: [
        {
          id: 'profile-1',
          enabled: false,
          type: 'http',
          host: 'proxy.example.com',
          port: '8080',
          username: '',
          password: '',
          websites: ['pixiv'],
        },
      ],
    });

    expect(profile).toBeNull();
  });

  it('uses enabled profile with empty websites for all sites', () => {
    const profile = resolveProfileForWebsite('pixiv', {
      profiles: [
        {
          id: 'profile-1',
          enabled: true,
          type: 'http',
          host: 'proxy.example.com',
          port: '8080',
          username: '',
          password: '',
          websites: [],
        },
      ],
    });

    expect(profile?.id).toBe('profile-1');
  });

  it('prefers explicit website assignment over all-websites profile', () => {
    const profile = resolveProfileForWebsite('pixiv', {
      profiles: [
        {
          id: 'wildcard',
          enabled: true,
          type: 'http',
          host: '127.0.0.1',
          port: '7890',
          username: '',
          password: '',
          websites: [],
        },
        {
          id: 'pixiv-only',
          enabled: true,
          type: 'socks5',
          host: '127.0.0.1',
          port: '1080',
          username: '',
          password: '',
          websites: ['pixiv'],
        },
      ],
    });

    expect(profile?.id).toBe('pixiv-only');
  });
});
