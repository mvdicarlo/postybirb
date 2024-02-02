import { SubmissionType } from '../../enums';

/**
 * Website specific info to be passed down to consumers of the API.
 *
 * @interface IWebsiteInfo
 */
export interface IWebsiteInfo {
  websiteDisplayName: string;
  supports: SubmissionType[];
}
