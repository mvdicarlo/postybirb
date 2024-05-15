import { IWebsiteOptions, SubmissionRating } from '@postybirb/types';

export class RatingParser {
  public parse(
    defaultOptions: IWebsiteOptions,
    websiteOptions: IWebsiteOptions
  ): SubmissionRating {
    return (
      websiteOptions.data.rating ??
      defaultOptions.data.rating ??
      SubmissionRating.GENERAL
    );
  }
}
