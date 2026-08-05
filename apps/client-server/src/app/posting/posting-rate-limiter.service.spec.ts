import { IWebsiteMetadata } from '@postybirb/types';
import { PostingRateLimiterService } from './posting-rate-limiter.service';

function metadata(
  overrides: Partial<IWebsiteMetadata> = {},
): IWebsiteMetadata {
  return {
    name: 'test-website',
    displayName: 'Test Website',
    minimumPostWaitInterval: 1_000,
    ...overrides,
  };
}

describe('PostingRateLimiterService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'allows an interval of %s without storing a reservation',
    (minimumPostWaitInterval) => {
      const limiter = new PostingRateLimiterService();
      const website = metadata({ minimumPostWaitInterval });

      expect(limiter.acquire('account-1', website)).toEqual({
        acquired: true,
      });
      expect(limiter.acquire('account-1', website)).toEqual({
        acquired: true,
      });
    },
  );

  it('limits account-scoped reservations independently', () => {
    const limiter = new PostingRateLimiterService();
    jest.spyOn(Date, 'now').mockReturnValue(1_000);

    expect(limiter.acquire('account-1', metadata())).toEqual({
      acquired: true,
      rateLimitedUntil: new Date(2_000).toISOString(),
    });

    jest.spyOn(Date, 'now').mockReturnValue(1_500);
    expect(
      limiter.acquire(
        'account-1',
        metadata({ name: 'another-website' }),
      ),
    ).toEqual({
      acquired: false,
      rateLimitedUntil: new Date(2_000).toISOString(),
    });
    expect(limiter.acquire('account-2', metadata())).toEqual({
      acquired: true,
      rateLimitedUntil: new Date(2_500).toISOString(),
    });
  });

  it('shares website-scoped reservations across accounts', () => {
    const limiter = new PostingRateLimiterService();
    const pixiv = metadata({ name: 'pixiv', rateLimitScope: 'website' });
    jest.spyOn(Date, 'now').mockReturnValue(1_000);

    expect(limiter.acquire('account-1', pixiv).acquired).toBe(true);

    jest.spyOn(Date, 'now').mockReturnValue(1_500);
    expect(limiter.acquire('account-2', pixiv).acquired).toBe(false);
    expect(
      limiter.acquire(
        'account-2',
        metadata({ name: 'other', rateLimitScope: 'website' }),
      ).acquired,
    ).toBe(true);
  });

  it('allows a new reservation when the previous one expires', () => {
    const limiter = new PostingRateLimiterService();
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    limiter.acquire('account-1', metadata());

    jest.spyOn(Date, 'now').mockReturnValue(2_000);
    expect(limiter.acquire('account-1', metadata())).toEqual({
      acquired: true,
      rateLimitedUntil: new Date(3_000).toISOString(),
    });
  });
});