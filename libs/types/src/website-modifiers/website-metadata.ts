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
  displayName?: string;

  /**
   * How often in milliseconds login should be re-checked.
   */
  refreshInterval?: number;
}
