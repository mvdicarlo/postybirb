/**
 * Represents the dimensions of a file used in a website.
 * @typedef {Object} WebsiteFileDimension
 * @property {string} fileId - The ID of the file.
 * @property {number} height - The height of the file in pixels.
 * @property {number} width - The width of the file in pixels.
 */
export type ModifiedFileDimension = {
  /**
   * The ID of the file.
   * @type {string}
   */
  fileId: string;
  /**
   * The height of the file in pixels.
   * @type {number}
   */
  height: number;
  /**
   * The width of the file in pixels.
   * @type {number}
   */
  width: number;
};
