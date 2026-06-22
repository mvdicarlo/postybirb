import { resolveProxyForUrl } from './electron-proxy';
import { resolveTelegramSocksProxy } from './telegram-proxy';

jest.mock('./electron-proxy', () => ({
  getProxyConfiguration: jest.fn(),
  resolveProxyForUrl: jest.fn(),
}));

const mockedResolveProxyForUrl = resolveProxyForUrl as jest.MockedFunction<
  typeof resolveProxyForUrl
>;

describe('resolveTelegramSocksProxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined in direct mode', async () => {
    await expect(
      resolveTelegramSocksProxy({
        mode: 'direct',
        pool: [],
        routing: {},
      }),
    ).resolves.toBeUndefined();
  });

  it('uses fixed SOCKS5 pool entry in fixed_servers mode', async () => {
    const result = await resolveTelegramSocksProxy({
      mode: 'fixed_servers',
      fixedProxyId: 'socks-1',
      pool: [
        {
          id: 'socks-1',
          type: 'socks5',
          host: '127.0.0.1',
          port: '1080',
          username: 'user',
          password: 'pass',
        },
      ],
      routing: {},
    });

    expect(result).toEqual({
      ip: '127.0.0.1',
      port: 1080,
      socksType: 5,
      username: 'user',
      password: 'pass',
    });
  });

  it('warns and falls back to system SOCKS for HTTP fixed proxy', async () => {
    mockedResolveProxyForUrl.mockResolvedValue('SOCKS5 127.0.0.1:9050');

    const result = await resolveTelegramSocksProxy({
      mode: 'fixed_servers',
      fixedProxyId: 'http-1',
      pool: [
        {
          id: 'http-1',
          type: 'http',
          host: '127.0.0.1',
          port: '8080',
          username: '',
          password: '',
        },
      ],
      routing: {},
    });

    expect(result).toEqual({
      ip: '127.0.0.1',
      port: 9050,
      socksType: 5,
    });
  });

  it('uses PAC routing pool entry for telegram', async () => {
    const result = await resolveTelegramSocksProxy({
      mode: 'pac_routing',
      pool: [
        {
          id: 'tg-socks',
          type: 'socks5',
          host: '10.0.0.2',
          port: '1080',
          username: '',
          password: '',
        },
      ],
      routing: {
        telegram: 'tg-socks',
      },
    });

    expect(result).toEqual({
      ip: '10.0.0.2',
      port: 1080,
      socksType: 5,
    });
  });

  it('returns undefined when PAC routing sends telegram direct', async () => {
    await expect(
      resolveTelegramSocksProxy({
        mode: 'pac_routing',
        pool: [],
        routing: {
          telegram: 'direct',
        },
      }),
    ).resolves.toBeUndefined();
  });
});
