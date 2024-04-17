import { Injectable } from '@nestjs/common';
import { SubmissionRating } from '@postybirb/types';
import { WebsiteOptions } from '../database/entities';

@Injectable()
export class RatingParserService {
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
