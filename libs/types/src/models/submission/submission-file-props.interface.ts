// TODO - consider deleting model
export interface ISubmissionFileProps {
  /**
   * Flag for determining if a thumbnail needs to be re-generated on file replace
   * @type {boolean}
   */
  hasCustomThumbnail: boolean;
  /**
   * Height of the file (when image, otherwise 0)
   * @type {number}
   * @deprecated
   */
  height?: number;
  /**
   * Width of the file (when image, otherwise 0)
   * @type {number}
   * @deprecated - not sure if this ever got any use
   */
  width?: number;
}
