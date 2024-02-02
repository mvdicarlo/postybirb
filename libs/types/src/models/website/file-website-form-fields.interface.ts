import { IWebsiteFormFields } from '../submission/website-form-fields.interface';

/**
 * File submission specific fields.
 * @interface FileWebsiteFormFields
 * @extends {ISubmissionFields}
 */
export interface FileWebsiteFormFields extends IWebsiteFormFields {
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
