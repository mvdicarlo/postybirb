import { IWebsiteMetadata } from '@postybirb/types';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { PostingRateLimiterService } from './posting-rate-limiter.service';

function metadata(overrides: Partial<IWebsiteMetadata> = {}): IWebsiteMetadata {
  return {
    name: 'test-website',
    displayName: 'Test Website',
    minimumPostWaitInterval: 1_000,
    ...overrides,
  };
}

describe('PostingRateLimiterService', () => {
  function createLimiter() {
    const websiteRegistry = {
      getWebsiteDefinitions: jest.fn().mockReturnValue([]),
    };
    const accountRepository = {
      findAll: jest.fn().mockResolvedValue([]),
    };
    const unitOfWorkRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    const limiter = new PostingRateLimiterService(
      websiteRegistry as unknown as WebsiteRegistryService,
    );
    Object.assign(limiter, {
      accountRepository,
      unitOfWorkRepository,
    });
    return {
      accountRepository,
      limiter,
      unitOfWorkRepository,
      websiteRegistry,
    };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'allows an interval of %s without storing a reservation',
    async (minimumPostWaitInterval) => {
      const { limiter } = createLimiter();
      const website = metadata({ minimumPostWaitInterval });

      await expect(limiter.acquire('account-1', website)).resolves.toEqual({
        acquired: true,
      });
      await expect(limiter.acquire('account-1', website)).resolves.toEqual({
        acquired: true,
      });
    },
  );

  it('limits account-scoped reservations independently', async () => {
    const { limiter } = createLimiter();
    jest.spyOn(Date, 'now').mockReturnValue(1_000);

    await expect(limiter.acquire('account-1', metadata())).resolves.toEqual({
      acquired: true,
      rateLimitedUntil: new Date(2_000).toISOString(),
    });

    jest.spyOn(Date, 'now').mockReturnValue(1_500);
    await expect(
      limiter.acquire('account-1', metadata({ name: 'another-website' })),
    ).resolves.toEqual({
      acquired: false,
      rateLimitedUntil: new Date(2_000).toISOString(),
    });
    await expect(limiter.acquire('account-2', metadata())).resolves.toEqual({
      acquired: true,
      rateLimitedUntil: new Date(2_500).toISOString(),
    });
  });

  it('shares website-scoped reservations across accounts', async () => {
    const { limiter } = createLimiter();
    const pixiv = metadata({ name: 'pixiv', rateLimitScope: 'website' });
    jest.spyOn(Date, 'now').mockReturnValue(1_000);

    await expect(limiter.acquire('account-1', pixiv)).resolves.toMatchObject({
      acquired: true,
    });

    jest.spyOn(Date, 'now').mockReturnValue(1_500);
    await expect(limiter.acquire('account-2', pixiv)).resolves.toMatchObject({
      acquired: false,
    });
    await expect(
      limiter.acquire(
        'account-2',
        metadata({ name: 'other', rateLimitScope: 'website' }),
      ),
    ).resolves.toMatchObject({ acquired: true });
  });

  it('allows a new reservation when the previous one expires', async () => {
    const { limiter } = createLimiter();
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    await limiter.acquire('account-1', metadata());

    jest.spyOn(Date, 'now').mockReturnValue(2_000);
    await expect(limiter.acquire('account-1', metadata())).resolves.toEqual({
      acquired: true,
      rateLimitedUntil: new Date(3_000).toISOString(),
    });
  });

  it('extends an existing reservation from a server-directed timestamp', async () => {
    const { limiter } = createLimiter();
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    await limiter.acquire('account-1', metadata());

    await expect(
      limiter.setRateLimit(
        'account-1',
        metadata(),
        new Date(3_000).toISOString(),
      ),
    ).resolves.toBe(new Date(3_000).toISOString());
    await expect(
      limiter.setRateLimit(
        'account-1',
        metadata(),
        new Date(1_500).toISOString(),
      ),
    ).resolves.toBe(new Date(3_000).toISOString());

    jest.spyOn(Date, 'now').mockReturnValue(2_500);
    await expect(limiter.acquire('account-1', metadata())).resolves.toEqual({
      acquired: false,
      rateLimitedUntil: new Date(3_000).toISOString(),
    });
  });

  it('honors a server-directed reservation without a static interval', async () => {
    const { limiter } = createLimiter();
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const website = metadata({ minimumPostWaitInterval: undefined });

    await limiter.setRateLimit(
      'account-1',
      website,
      new Date(3_000).toISOString(),
    );

    jest.spyOn(Date, 'now').mockReturnValue(2_000);
    await expect(limiter.acquire('account-1', website)).resolves.toEqual({
      acquired: false,
      rateLimitedUntil: new Date(3_000).toISOString(),
    });
  });

  it('rejects an invalid server-directed timestamp', async () => {
    const { limiter } = createLimiter();

    await expect(
      limiter.setRateLimit('account-1', metadata(), 'not-a-date'),
    ).rejects.toThrow("Invalid rate limit timestamp 'not-a-date'");
  });

  it('hydrates the latest website-scoped reservation once', async () => {
    const {
      accountRepository,
      limiter,
      unitOfWorkRepository,
      websiteRegistry,
    } = createLimiter();
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    unitOfWorkRepository.find.mockResolvedValue([
      {
        accountId: 'account-1',
        rateLimitedUntil: new Date(2_000).toISOString(),
      },
      {
        accountId: 'account-2',
        rateLimitedUntil: new Date(3_000).toISOString(),
      },
      {
        accountId: 'account-3',
        rateLimitedUntil: new Date(500).toISOString(),
      },
    ]);
    accountRepository.findAll.mockResolvedValue([
      { id: 'account-1', website: 'pixiv' },
      { id: 'account-2', website: 'pixiv' },
      { id: 'account-3', website: 'pixiv' },
    ]);
    websiteRegistry.getWebsiteDefinitions.mockReturnValue([
      {
        id: 'pixiv',
        metadata: metadata({
          name: 'pixiv',
          rateLimitScope: 'website',
        }),
      },
    ]);

    await Promise.all([limiter.initialize(), limiter.initialize()]);

    expect(accountRepository.findAll).toHaveBeenCalledTimes(1);
    expect(unitOfWorkRepository.find).toHaveBeenCalledTimes(1);
    await expect(
      limiter.acquire(
        'account-4',
        metadata({ name: 'pixiv', rateLimitScope: 'website' }),
      ),
    ).resolves.toEqual({
      acquired: false,
      rateLimitedUntil: new Date(3_000).toISOString(),
    });
  });

  it('hydrates a server-directed reservation without a static interval', async () => {
    const {
      accountRepository,
      limiter,
      unitOfWorkRepository,
      websiteRegistry,
    } = createLimiter();
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    unitOfWorkRepository.find.mockResolvedValue([
      {
        accountId: 'account-1',
        rateLimitedUntil: new Date(3_000).toISOString(),
      },
    ]);
    accountRepository.findAll.mockResolvedValue([
      { id: 'account-1', website: 'dynamic-website' },
    ]);
    websiteRegistry.getWebsiteDefinitions.mockReturnValue([
      {
        id: 'dynamic-website',
        metadata: metadata({
          name: 'dynamic-website',
          minimumPostWaitInterval: undefined,
        }),
      },
    ]);

    await limiter.initialize();

    jest.spyOn(Date, 'now').mockReturnValue(2_000);
    await expect(
      limiter.acquire(
        'account-2',
        metadata({
          name: 'dynamic-website',
          minimumPostWaitInterval: undefined,
          rateLimitScope: 'website',
        }),
      ),
    ).resolves.toEqual({
      acquired: true,
    });
    await expect(
      limiter.acquire(
        'account-1',
        metadata({
          name: 'dynamic-website',
          minimumPostWaitInterval: undefined,
        }),
      ),
    ).resolves.toEqual({
      acquired: false,
      rateLimitedUntil: new Date(3_000).toISOString(),
    });
  });

  it('serializes concurrent acquisitions after initialization', async () => {
    const { limiter } = createLimiter();
    jest.spyOn(Date, 'now').mockReturnValue(1_000);

    const reservations = await Promise.all([
      limiter.acquire('account-1', metadata()),
      limiter.acquire('account-1', metadata()),
    ]);

    expect(reservations.filter(({ acquired }) => acquired)).toHaveLength(1);
    expect(reservations.filter(({ acquired }) => !acquired)).toHaveLength(1);
  });

  it('retries hydration after a transient initialization failure', async () => {
    const { limiter, unitOfWorkRepository } = createLimiter();
    unitOfWorkRepository.find
      .mockRejectedValueOnce(new Error('Database unavailable'))
      .mockResolvedValueOnce([]);

    await expect(limiter.initialize()).rejects.toThrow('Database unavailable');
    await expect(limiter.initialize()).resolves.toBeUndefined();

    expect(unitOfWorkRepository.find).toHaveBeenCalledTimes(2);
  });
});
