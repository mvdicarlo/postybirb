import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CommonSchema } from './common.schema';

/**
 * Persisted per-key rate-limit window. The `key` is computed by the engine's
 * rateKey() from a website's declared scope (account | website |
 * website+account). Persisting `lastPostedAt` lets rate-limit windows survive
 * application restarts (the legacy in-memory map did not).
 */
export const PostRateWindowSchema = sqliteTable('post-rate-window', {
  ...CommonSchema(),
  /** Bucket key, unique. */
  key: text().notNull().unique(),
  /** ISO timestamp of the most recent post for this key. */
  lastPostedAt: text().notNull(),
});
