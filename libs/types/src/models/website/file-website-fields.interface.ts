import { ISubmissionFields } from '../submission/submission-fields.interface';

/**
 * File submission specific fields.
 * @interface FileWebsiteOptions
 * @extends {ISubmissionFields}
 */
export interface FileWebsiteFields extends ISubmissionFields {
  /**
   * Whether the thumbnail should be used.
   * TODO determine if this makes sense anymore
   * @type {boolean}
   */
  useThumbnail: boolean;

  /**
   * Whether to allow the file to be resized.
   * TODO determine if this makes sense anymore
   * @type {boolean}
   */
  allowResize: boolean;
}
