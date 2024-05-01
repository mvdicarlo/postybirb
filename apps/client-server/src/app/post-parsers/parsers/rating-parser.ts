import { SubmissionRating } from '@postybirb/types';
import { WebsiteOptions } from '../../database/entities';

export class RatingParser {
  public parse(
    defaultOptions: WebsiteOptions,
    websiteOptions: WebsiteOptions
  ): SubmissionRating {
    return (
      websiteOptions.data.rating ??
      defaultOptions.data.rating ??
      SubmissionRating.GENERAL
    );
  }
}
