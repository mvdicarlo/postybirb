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
   * Indicates a website that takes a source URL as input.
   * This is used for determining the order of posting websites.
   * Websites that support external sources will be posted last unless
   * otherwise overridden.
   */
  acceptsExternalSources?: boolean;

  /**
   * The batch size of files to send to the website.
   * Defaults to 1.
   */
  fileBatchSize?: number;

  /**
   * How often in milliseconds login should be re-checked.
   */
  refreshInterval?: number;
}
