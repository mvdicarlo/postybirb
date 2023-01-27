import { SubmissionRating } from '../enums';
import { DescriptionValue } from './description-value';
import { TagValue } from './tag-value';

export interface IBaseWebsiteOptions {
  title?: string;
  tags?: TagValue;
  description?: DescriptionValue;
  rating: SubmissionRating;
}
