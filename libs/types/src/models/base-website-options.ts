import { SubmissionRating } from '../enums';
import { TagValue } from './tag-value';

export interface BaseWebsiteOptions {
  title?: string;
  tags: TagValue;
  description: unknown;
  rating: SubmissionRating;
}
