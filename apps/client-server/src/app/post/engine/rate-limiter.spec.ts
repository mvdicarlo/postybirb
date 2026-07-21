import { MemoryRateStore, RateLimiter, rateKey } from './rate-limiter';

describe('Relay rate limiter', () => {
  it('computes wait windows from the persisted store', async () => {
    const rl = new RateLimiter(new MemoryRateStore());
    const t0 = 1_000_000;
    expect(await rl.waitMs('acct', 1000, t0)).toBe(0);
    await rl.markPosted('acct', t0);
    expect(await rl.waitMs('acct', 1000, t0 + 200)).toBe(800);
    expect(await rl.waitMs('acct', 1000, t0 + 1000)).toBe(0);
  });

  it('keys buckets by scope', () => {
    expect(rateKey('account', 'fa', 'a1')).toBe('a:a1');
    expect(rateKey('website', 'fa', 'a1')).toBe('w:fa');
    expect(rateKey('website+account', 'fa', 'a1')).toBe('w:fa|a:a1');
    expect(rateKey(undefined, 'fa', 'a1')).toBe('a:a1');
  });

  it('shares a website-scoped window across accounts', async () => {
    const rl = new RateLimiter(new MemoryRateStore());
    const t0 = 1_000_000;
    await rl.markPosted(rateKey('website', 'fa', 'a1'), t0);
    expect(await rl.waitMs(rateKey('website', 'fa', 'a2'), 1000, t0 + 200)).toBe(800);

    const rl2 = new RateLimiter(new MemoryRateStore());
    await rl2.markPosted(rateKey('account', 'fa', 'a1'), t0);
    expect(await rl2.waitMs(rateKey('account', 'fa', 'a2'), 1000, t0 + 200)).toBe(0);
  });
});
