import { WebsiteId } from '../../website/website.type';
import { ModifiedFileDimension } from './modified-file-dimension.type';

/**
 * Represents the metadata for a file.
 * @typedef {Object} FileMetadataFields
 * @property {string} altText - The alternative text for the file.
 * @property {Record<WebsiteId, ModifiedFileDimension>} dimensions - The dimensions of the file for different websites.
 * @property {string[]} ignoredWebsites - The list of websites where the file is ignored.
 */
export type FileMetadataFields = {
  /**
   * The alternative text for the file.
   * @type {string}
   */
  altText: string;
  /**
   * The dimensions of the file for different websites.
   * @type {Record<WebsiteId, ModifiedFileDimension>}
   */
  dimensions: Record<WebsiteId, ModifiedFileDimension>;
  /**
   * The list of websites where the file is ignored.
   * @type {WebsiteId[]}
   */
  ignoredWebsites: WebsiteId[];
};
