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
   * A list of accepted Mime types.
   * Only needed when using File posting websites.
   */
  acceptedMimeTypes?: string[];

  /**
   * The acceptable file size limits in Megabytes.
   * Only needed when using File posting websites.
   *
   * Example:
   *  {
   *    'image/*': 5,
   *    'text/*': 2
   *  }
   */
  acceptedFileSizes?: Record<string, number>;

  /**
   * Whether or not the website supports sending multiple files
   * in a single post.
   *
   * Only needed when using File posting websites.
   */
  allowAdditionalFiles?: boolean;

  /**
   * Whether or not the website supports tags.
   */
  supportsTags?: boolean;

  /**
   * How often in milliseconds login should be re-checked.
   */
  refreshInterval?: number;
}
