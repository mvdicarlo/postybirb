/**
 * Relay posting framework — per-account rate limiting.
 *
 * Replaces the old in-memory `lastTimePostedToWebsite` map with a small
 * persisted leaky bucket keyed by account. Because `lastPostedAt` is persisted,
 * rate-limit windows survive an app restart (the old design lost them).
 *
 * For the prototype, persistence is a swappable Store interface backed by an
 * in-memory map; in the real app this is a tiny SQLite table.
 */

export interface RateStore {
  get(key: string): number | undefined; // last posted epoch ms
  set(key: string, ts: number): void;
}

export class MemoryRateStore implements RateStore {
  private readonly map = new Map<string, number>();
  get(key: string): number | undefined {
    return this.map.get(key);
  }
  set(key: string, ts: number): void {
    this.map.set(key, ts);
  }
}

export class RateLimiter {
  private readonly store: RateStore;
  constructor(store?: RateStore) {
    this.store = store ?? new MemoryRateStore();
  }

  /**
   * Returns the epoch-ms time at which `key` may next post, given the website's
   * minimum interval. If <= now, it can post immediately.
   */
  nextAllowedAt(key: string, minIntervalMs: number, now = Date.now()): number {
    if (!minIntervalMs) return now;
    const last = this.store.get(key);
    if (last === undefined) return now;
    return last + minIntervalMs;
  }

  /** ms `key` must wait before posting (0 if none). */
  waitMs(key: string, minIntervalMs: number, now = Date.now()): number {
    return Math.max(0, this.nextAllowedAt(key, minIntervalMs, now) - now);
  }

  /** Record that `key` just posted (starts the next window). */
  markPosted(key: string, now = Date.now()): void {
    this.store.set(key, now);
  }
}

/**
 * Compute the rate-limit bucket key for a posting attempt based on the
 * website's declared scope. Defaults to per-account.
 */
export function rateKey(
  scope: 'account' | 'website' | 'website+account' | undefined,
  websiteId: string,
  accountId: string,
): string {
  switch (scope) {
    case 'website':
      return `w:${websiteId}`;
    case 'website+account':
      return `w:${websiteId}|a:${accountId}`;
    case 'account':
    default:
      return `a:${accountId}`;
  }
}
