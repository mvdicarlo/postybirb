import { SubmissionRating } from '../../enums';
import { TagValue } from '../tag/tag-value.type';
import { DescriptionValue } from './description-value.type';

/**
 * An interface representing the base fields for a submission.
 * @interface
 */
export interface IWebsiteFormFields {
  /**
   * The title of the submission.
   * @type {string|undefined}
   */
  title?: string;

  /**
   * The tags associated with the submission.
   * @type {TagValue|undefined}
   */
  tags?: TagValue;

  /**
   * The description of the submission.
   * @type {DescriptionValue|undefined}
   */
  description?: DescriptionValue;

  /**
   * The rating of the submission.
   * @type {SubmissionRating}
   */
  rating: SubmissionRating;

  /**
   * Optional spoiler/content warning text
   * @type {string}
   */
  contentWarning?: string;
}
