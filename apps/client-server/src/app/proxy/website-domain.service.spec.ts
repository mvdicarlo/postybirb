import { Account } from '@postybirb/database';
import { WebsiteDomainService } from './website-domain.service';
import { WebsiteRegistryService } from '../websites/website-registry.service';

jest.mock('@postybirb/database', () => {
  const actual = jest.requireActual('@postybirb/database');

  return {
    ...actual,
    WebsiteDataRepository: jest.fn().mockImplementation(() => ({
      findById: jest.fn().mockResolvedValue(null),
    })),
  };
});

describe('WebsiteDomainService', () => {
  let service: WebsiteDomainService;
  let websiteRegistry: jest.Mocked<
    Pick<WebsiteRegistryService, 'collectProxyDomainsForAccounts'>
  >;

  beforeEach(() => {
    websiteRegistry = {
      collectProxyDomainsForAccounts: jest.fn(),
    };
    service = new WebsiteDomainService(
      websiteRegistry as unknown as WebsiteRegistryService,
    );
  });

  it('returns no domains when there are no accounts', async () => {
    websiteRegistry.collectProxyDomainsForAccounts.mockReturnValue([
      'example.com',
    ]);

    await expect(service.getDomainsForRouting('pixiv', [])).resolves.toEqual([]);
  });

  it('does not query the registry when there are no accounts', async () => {
    await service.getDomainsForRouting('pixiv', []);

    expect(websiteRegistry.collectProxyDomainsForAccounts).not.toHaveBeenCalled();
  });

  it('loads static domains from existing website instances', async () => {
    websiteRegistry.collectProxyDomainsForAccounts.mockReturnValue([
      'pixiv.net',
    ]);

    const account = new Account({
      id: 'acc-1',
      name: 'test',
      website: 'pixiv',
      groups: [],
    });

    await expect(
      service.getDomainsForRouting('pixiv', [account]),
    ).resolves.toEqual(['pixiv.net']);
    await expect(
      service.getDomainsForRouting('pixiv', [account]),
    ).resolves.toEqual(['pixiv.net']);

    expect(websiteRegistry.collectProxyDomainsForAccounts).toHaveBeenCalledTimes(
      1,
    );
    expect(websiteRegistry.collectProxyDomainsForAccounts).toHaveBeenCalledWith([
      account,
    ]);
  });
});
