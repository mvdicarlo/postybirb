import { Account } from '@postybirb/database';
import { WebsiteDomainService } from './website-domain.service';

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

  beforeEach(() => {
    service = new WebsiteDomainService();
  });

  it('returns no domains when there are no accounts', async () => {
    service.setStaticDomainProvider(() => ['example.com']);

    await expect(service.getDomainsForRouting('pixiv', [])).resolves.toEqual([]);
  });

  it('does not invoke the static provider when there are no accounts', async () => {
    const provider = jest.fn(() => ['example.com']);
    service.setStaticDomainProvider(provider);

    await service.getDomainsForRouting('pixiv', []);

    expect(provider).not.toHaveBeenCalled();
  });

  it('lazy-loads static domains only when accounts exist', async () => {
    const provider = jest
      .fn()
      .mockReturnValueOnce(['pixiv.net'])
      .mockReturnValueOnce(['should-not-run.example']);
    service.setStaticDomainProvider(provider);

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

    expect(provider).toHaveBeenCalledTimes(1);
  });
});
