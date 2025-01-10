import { SubmissionRating } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { DefaultWebsiteOptions } from '../../websites/models/default-website-options';

export class RatingParser {
  public parse(
    defaultOptions: DefaultWebsiteOptions,
    websiteOptions: BaseWebsiteOptions,
  ): SubmissionRating {
    if (websiteOptions.rating) {
      return websiteOptions.rating;
    }

    if (defaultOptions.rating) {
      return defaultOptions.rating;
    }

    throw new Error('No rating found');
  }
}
