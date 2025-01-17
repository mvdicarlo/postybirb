import { FileType } from '../enums';

export type WebsiteFileOptions = {
  /**
   * A list of accepted Mime types.
   * Only needed when using File posting websites.
   */
  acceptedMimeTypes: string[];

  /**
   * The acceptable file size limits in bytes.
   * Only needed when using File posting websites.
   * Supports FileType(FileType.IMAGE), MimeType (image/png), WildCard (image/*),
   * and File Extension (e.g. '.txt')
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
};
