import { RatingField, TextField } from '@postybirb/form-builder';
import { SubmissionRating } from '@postybirb/types';
import { BaseWebsiteOptions } from './base-website-options';

export class DefaultWebsiteOptions extends BaseWebsiteOptions {
  @TextField({
    label: 'contentWarning',
    section: 'common',
    span: 12,
    hidden: false,
  })
  declare contentWarning: string;

  @RatingField({})
  declare rating: SubmissionRating;

  constructor(options: Partial<DefaultWebsiteOptions> = {}) {
    super(options);
    // Apply defaults after parent constructor to avoid field initializer overwrite
    this.contentWarning = this.contentWarning ?? '';
    this.rating = this.rating ?? SubmissionRating.GENERAL;
  }
}
