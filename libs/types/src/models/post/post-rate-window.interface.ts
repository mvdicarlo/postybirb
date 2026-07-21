/**
 * A persisted per-key rate-limit window. The key is computed by the engine's
 * rateKey() from the website's declared scope (account | website |
 * website+account). Persisting `lastPostedAt` lets rate-limit windows survive
 * application restarts.
 * @interface IPostRateWindow
 */
export interface IPostRateWindow {
  /** Bucket key, e.g. 'a:<accountId>' | 'w:<websiteId>' | 'w:<websiteId>|a:<accountId>'. */
  key: string;

  /** ISO timestamp of the most recent post for this key. */
  lastPostedAt: string;
}
