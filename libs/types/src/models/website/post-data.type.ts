import { IWebsiteFormFields } from '../submission/website-form-fields.interface';
import { ISubmission } from '../submission/submission.interface';

/**
 * The data associated with a post request.
 * @template S - The type of submission.
 * @template T - The type of submission options.
 * @typedef {Object} PostData
 * @property {T} options - The submission options.
 * @property {S} submission - The submission data.
 */
export type PostData<S extends ISubmission, T extends IWebsiteFormFields> = {
  /**
   * The submission options.
   * @type {T}
   */
  options: T;
  /**
   * The submission data.
   * @type {S}
   */
  submission: S;
};
