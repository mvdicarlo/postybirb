export interface IWebsiteMetadata {
  /**
   * Internal name of the website to be used.
   * You will set this once and never change it once released.
   */
  name: string;

  /**
   * Display name of the website to be shown.
   * If not provided, will default to capitalized name property.
   */
  displayName: string;

  /**
   * How often in milliseconds login should be re-checked.
   */
  refreshInterval?: number;

  /**
   * Minimum wait time before a post can be made after a post has been made.
   * This is used to prevent the website from being spammed with posts or to avoid
   * spam detection measures.
   */
  minimumPostWaitInterval?: number;

  /**
   * What the rate-limit window is keyed by (Relay engine).
   *  - 'account'        : per login (default; most sites)
   *  - 'website'        : global across all accounts on this website
   *  - 'website+account': both (rare; e.g. shared IP + per-user limits)
   */
  rateLimitScope?: 'account' | 'website' | 'website+account';
}
