/**
 * Defines dimensions for a file.
 * @interface IFileDimensions
 */
export interface IFileDimensions {
  /**
   * The size of the file in bytes.
   * @type {number}
   */
  size: number;

  /**
   * The width of the file in pixels.
   * @type {number}
   */
  width: number;

  /**
   * The height of the file in pixels.
   * @type {number}
   */
  height: number;
}
