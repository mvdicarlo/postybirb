/* eslint-disable max-classes-per-file */
/**
 * Relay engine — per-key rate limiting with persistence.
 *
 * The bucket key is computed by {@link rateKey} from the website's declared
 * scope (account | website | website+account). A {@link RateStore} backs the
 * window; the SQLite-backed store persists `lastPostedAt` so rate-limit
 * windows survive application restarts and are shared across concurrently-
 * running jobs.
 */

import { Injectable, Optional } from '@nestjs/common';
import { PostRateWindowRepository } from '@postybirb/database';
import { RateLimitScope } from '@postybirb/types';

/**
 * Storage seam for the per-bucket "last posted at" timestamp. Abstracted so
 * tests can use the in-memory implementation while production persists to
 * SQLite, keeping rate-limit windows across restarts.
 */
export interface RateStore {
  get(key: string): Promise<number | undefined>; // last posted epoch ms
  set(key: string, ts: number): Promise<void>;
}

/** In-memory store for tests / fallback. */
export class MemoryRateStore implements RateStore {
  private readonly map = new Map<string, number>();

  async get(key: string): Promise<number | undefined> {
    return this.map.get(key);
  }

  async set(key: string, ts: number): Promise<void> {
    this.map.set(key, ts);
  }
}

/** SQLite-backed store (post-rate-window table). */
export class SqliteRateStore implements RateStore {
  private readonly repository = new PostRateWindowRepository();

  async get(key: string): Promise<number | undefined> {
    const row = await this.repository.findByKey(key);
    return row ? new Date(row.lastPostedAt).getTime() : undefined;
  }

  async set(key: string, ts: number): Promise<void> {
    const iso = new Date(ts).toISOString();
    const existing = await this.repository.findByKey(key);
    if (existing) {
      await this.repository.update(existing.id, { lastPostedAt: iso });
    } else {
      await this.repository.insert({ key, lastPostedAt: iso });
    }
  }
}

/**
 * Compute the rate-limit bucket key for a posting attempt based on scope.
 * Defaults to per-account.
 */
export function rateKey(
  scope: RateLimitScope | undefined,
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

/**
 * Per-bucket minimum-interval gate. Given a key (computed by {@link rateKey})
 * and the website's `minimumPostWaitInterval`, answers "how long must this
 * key wait before its next post?" and records the moment a post actually
 * went out. Shared across concurrent jobs through the underlying store, so a
 * busy account on one job correctly throttles a second job that uses the
 * same account.
 */
@Injectable()
export class RateLimiter {
  private readonly store: RateStore;

  constructor(@Optional() store?: RateStore) {
    this.store = store ?? new SqliteRateStore();
  }

  /** Epoch-ms time at which `key` may next post. */
  async nextAllowedAt(
    key: string,
    minIntervalMs: number,
    now = Date.now(),
  ): Promise<number> {
    if (!minIntervalMs) return now;
    const last = await this.store.get(key);
    if (last === undefined) return now;
    return last + minIntervalMs;
  }

  /** ms `key` must wait before posting (0 if none). */
  async waitMs(
    key: string,
    minIntervalMs: number,
    now = Date.now(),
  ): Promise<number> {
    return Math.max(0, (await this.nextAllowedAt(key, minIntervalMs, now)) - now);
  }

  /** Record that `key` just posted (starts the next window). */
  async markPosted(key: string, now = Date.now()): Promise<void> {
    await this.store.set(key, now);
  }
}
