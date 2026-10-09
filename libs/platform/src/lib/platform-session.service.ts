import {
  PlatformCookie,
  PlatformCookieChange,
  PlatformCookieDetails,
  PlatformCookieFilter,
} from './cookie-types';

/**
 * Storage types that {@link PlatformSessionService.clearStorageData} can
 * selectively clear. Mirrors the subset of Electron's storage names that
 * PostyBirb relies on.
 */
export type PlatformStorageType =
  | 'cookies'
  | 'localstorage'
  | 'indexdb'
  | 'filesystem'
  | 'serviceworkers'
  | 'cachestorage';

/** Options controlling which storage types are cleared. */
export type PlatformClearStorageOptions = {
  /** Limit the clear to these storage types. Clears everything when omitted. */
  storages?: PlatformStorageType[];
};

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
   * Clears storage associated with the partition.
   *
   * By default clears all storage (cookies, localStorage, indexedDB, cache).
   * Pass `options.storages` to limit the clear to specific storage types
   * (e.g. `['cookies']` to refresh cookies while preserving localStorage).
   */
  abstract clearStorageData(
    partition: string,
    options?: PlatformClearStorageOptions,
  ): Promise<void>;

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
