import { FileType } from '../enums';

export type WebsiteFileOptions = {
  /**
   * A list of accepted Mime types.
   * Only needed when using File posting websites.
   *
   * Set empty to accept all mime types
   */
  acceptedMimeTypes: string[];

  /**
   * The acceptable file size limits in bytes.
   * Only needed when using File posting websites.
   * Supports FileType (FileType.IMAGE), MimeType (image/png), WildCard (image/*),
   * and File Extension (e.g. '.txt'). If the limit is not specified or not found for the file type Number.MAX_SAFE_INTEGER is used
   *
   * Example:
   *  {
   *    'image/*': 5 * 1024 * 1024,
   *    'text/*': 2 * 1024 * 1024,
   *    '*': 10 * 1024 * 1024,
   *  }
   */
  acceptedFileSizes?: Record<string, number>;

  /**
   * Indicates a website that takes a source URL as input.
   * This is used for determining the order of posting websites.
   * Websites that support external sources will be posted last unless
   * otherwise overridden.
   */
  acceptsExternalSourceUrls?: boolean;

  /**
   * The batch size of files to send to the website.
   * Defaults to 1.
   */
  fileBatchSize?: number;

  /**
   * The supported file types for the website.
   */
  supportedFileTypes: FileType[];

  /**
   * If file alt text is equal or greater then this number it will be trimmed and the warning will be shown
   */
  maxAltTextLength?: number;

  /**
   * How many upstream source URLs this site needs before it may post (Relay
   * engine). Only meaningful with `acceptsExternalSourceUrls: true`.
   *  - 'allSettled' (default) : wait for every standard task to settle (any
   *                             outcome), then post best-effort with whatever
   *                             URLs exist. A failed upstream never skips this
   *                             site.
   *  - 'all'                  : require every standard task to succeed/skip; a
   *                             failed upstream skips this site.
   *  - 'any'                  : post as soon as the first upstream URL exists
   *  - { count: n }           : wait for n upstream URLs
   */
  sourceDependencyMode?: 'all' | 'allSettled' | 'any' | { count: number };
};
