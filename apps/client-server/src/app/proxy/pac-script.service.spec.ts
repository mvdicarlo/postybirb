import { AccountRepository } from '@postybirb/database';
import { PacScriptService } from './pac-script.service';
import { WebsiteDomainService } from './website-domain.service';

jest.mock('@postybirb/utils/common', () => {
  const actual = jest.requireActual('@postybirb/utils/common');

  return {
    ...actual,
    PostyBirbEnvConfig: {
      port: '9487',
      headless: false,
    },
    resolveCloudApiUrl: () => 'https://postybirb.azurewebsites.net/api',
  };
});

describe('PacScriptService', () => {
  const websiteDomainService = {
    getDomainsForRouting: jest.fn(),
  } as unknown as WebsiteDomainService;

  const accountRepository = {
    find: jest.fn(),
  } as unknown as AccountRepository;

  let service: PacScriptService;

  beforeEach(() => {
    jest.clearAllMocks();
    accountRepository.find = jest.fn().mockResolvedValue([
      {
        id: 'acc-1',
        website: 'pixiv',
      } as never,
    ]);
    service = new PacScriptService(websiteDomainService, accountRepository);
    websiteDomainService.getDomainsForRouting = jest
      .fn()
      .mockResolvedValue(['pixiv.net']);
  });

  it('generates PAC with pool routing and DIRECT fallback', async () => {
    const script = await service.generate({
      mode: 'pac_routing',
      pool: [
        {
          id: 'pool-1',
          type: 'http',
          host: '127.0.0.1',
          port: '8080',
          username: '',
          password: '',
        },
      ],
      routing: {
        pixiv: 'pool-1',
      },
      pacAccessToken: 'test-token',
    });

    expect(script).toMatchInlineSnapshot(`
"function FindProxyForURL(url, host) {
  if (isPlainHostName(host) || host == "localhost") return "DIRECT";
  if (host == "127.0.0.1" || host == "::1") return "DIRECT";
  if (host == "postybirb.azurewebsites.net" || dnsDomainIs(host, ".postybirb.azurewebsites.net")) return "DIRECT";
  if ((host == "127.0.0.1" || host == "localhost") && url.indexOf(":9487/") > -1) return "DIRECT";
  if (host == "pixiv.net" || dnsDomainIs(host, ".pixiv.net")) return "PROXY 127.0.0.1:8080";
  return "DIRECT";
}"
`);
  });

  it('omits system routing choices from PAC output', async () => {
    const script = await service.generate({
      mode: 'pac_routing',
      pool: [],
      routing: {
        pixiv: 'system',
      },
      pacAccessToken: 'test-token',
    });

    expect(script).toMatchInlineSnapshot(`
"function FindProxyForURL(url, host) {
  if (isPlainHostName(host) || host == "localhost") return "DIRECT";
  if (host == "127.0.0.1" || host == "::1") return "DIRECT";
  if (host == "postybirb.azurewebsites.net" || dnsDomainIs(host, ".postybirb.azurewebsites.net")) return "DIRECT";
  if ((host == "127.0.0.1" || host == "localhost") && url.indexOf(":9487/") > -1) return "DIRECT";
  return "DIRECT";
}"
`);
    expect(websiteDomainService.getDomainsForRouting).not.toHaveBeenCalled();
  });
});
