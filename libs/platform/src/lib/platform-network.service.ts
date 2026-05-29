/**
 * Network capabilities that may be backed by Electron's `net` module
 * (with proxy support and OS-level certificate handling) or by the
 * standard Node fetch.
 */
export abstract class PlatformNetworkService {
  /** Returns true when the device has any usable network connection. */
  abstract isOnline(): boolean;

  /**
   * Performs an HTTP request. Implementations should follow the standard
   * Fetch API semantics.
   */
  abstract fetch(input: string | URL, init?: RequestInit): Promise<Response>;
}
