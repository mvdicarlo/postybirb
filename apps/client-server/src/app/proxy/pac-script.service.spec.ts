import { AccountRepository } from '@postybirb/database';
import { PacScriptService } from './pac-script.service';
import { WebsiteDomainService } from './website-domain.service';

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

    expect(script).toContain('function FindProxyForURL(url, host)');
    expect(script).toContain('return "PROXY 127.0.0.1:8080"');
    expect(script).toContain('pixiv.net');
    expect(script.trim().endsWith('return "DIRECT";\n}')).toBe(true);
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

    expect(script).not.toContain('pixiv.net');
    expect(websiteDomainService.getDomainsForRouting).not.toHaveBeenCalled();
  });
});
