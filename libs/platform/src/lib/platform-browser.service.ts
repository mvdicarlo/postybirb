/**
 * Headless browser interactions: load a URL in an isolated session, run
 * scripts in its document context, read storage, etc.
 *
 * Used by website implementations that need to scrape browser-only state
 * (localStorage, dynamic JS results) or that need to keep cookies fresh
 * by loading a real page.
 */
export abstract class PlatformBrowserService {
  /**
   * Loads `url` in a hidden window for `partition`, optionally waits, then
   * returns a JSON-serialized snapshot of `localStorage`.
   */
  abstract getLocalStorage<T = Record<string, string>>(
    partition: string,
    url: string,
    wait?: number,
  ): Promise<T>;

  /**
   * Loads `url` in a hidden window for `partition` and evaluates the
   * supplied script in the document context. Returns the script's result.
   *
   * @param wait Milliseconds to wait after page load before executing.
   * @param timeout Milliseconds to wait for the script to resolve before failing.
   */
  abstract runScriptOnPage<T>(
    partition: string,
    url: string,
    script: string,
    wait?: number,
    timeout?: number,
  ): Promise<T>;

  /**
   * Loads `url` in a hidden window solely as a side effect — typically to
   * refresh cookies or trigger session activity. Resolves once the page
   * has loaded (or rejects on load failure).
   */
  abstract ping(partition: string, url: string): Promise<void>;
}
