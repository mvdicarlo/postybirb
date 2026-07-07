import {
    PlatformCookie,
    PlatformCookieChange,
    PlatformCookieDetails,
    PlatformCookieFilter,
} from './cookie-types';

/**
 * Per-partition session and cookie management.
 *
 * Partitions isolate cookies, storage, and cache between accounts. The
 * partition string is the raw account identifier; implementations are
 * responsible for namespacing it (e.g. Electron's `persist:` prefix).
 */
export abstract class PlatformSessionService {
  /**
   * Retrieves cookies for a partition matching the optional filter. Returns
   * all cookies in the partition when no filter is supplied.
   */
  abstract getCookies(
    partition: string,
    filter?: PlatformCookieFilter,
  ): Promise<PlatformCookie[]>;

  /** Persists or replaces a cookie in the given partition. */
  abstract setCookie(
    partition: string,
    details: PlatformCookieDetails,
  ): Promise<void>;

  /**
   * Removes a single cookie identified by URL + name from the partition.
   */
  abstract removeCookie(
    partition: string,
    url: string,
    name: string,
  ): Promise<void>;

  /** Forces queued cookie writes to be persisted to disk. */
  abstract flushCookies(partition: string): Promise<void>;

  /**
   * Clears all storage (cookies, localStorage, indexedDB, cache) associated
   * with the partition.
   */
  abstract clearStorageData(partition: string): Promise<void>;

  /**
   * Subscribes to cookie changes for a partition. The callback fires whenever
   * a cookie in the partition is added, edited, or removed, providing a real
   * push signal for login/session changes instead of relying on polling.
   *
   * @returns An unsubscribe function. Implementations that cannot observe
   * cookie changes (e.g. non-Electron platforms or tests) return a no-op.
   */
  abstract onCookieChanged(
    partition: string,
    callback: (change: PlatformCookieChange) => void,
  ): () => void;
}
