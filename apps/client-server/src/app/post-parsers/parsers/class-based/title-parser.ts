import { SubmissionRating } from '@postybirb/types';
import { WebsiteOptions } from '../../../database/entities';
import { UnknownWebsite } from '../../../websites/website';

// TODO - use form generator to check title length requirements
export class TitleParser {
  public parse(
    instance: UnknownWebsite,
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
