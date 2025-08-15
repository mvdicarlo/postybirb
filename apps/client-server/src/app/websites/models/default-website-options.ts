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
  contentWarning = '';

  @RatingField({})
  rating: SubmissionRating = SubmissionRating.GENERAL;
}
