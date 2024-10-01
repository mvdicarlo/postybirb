import { IWebsiteOptions, SubmissionRating } from '@postybirb/types';

export class RatingParser {
  public parse(
    defaultOptions: IWebsiteOptions,
    websiteOptions: IWebsiteOptions
  ): SubmissionRating {
    if (websiteOptions.data.rating) {
      return websiteOptions.data.rating;
    }

    if (defaultOptions.data.rating) {
      return defaultOptions.data.rating;
    }

    throw new Error('No rating found');
  }
}
