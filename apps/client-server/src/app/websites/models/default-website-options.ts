import { RatingField, TextField } from '@postybirb/form-builder';
import { SubmissionRating } from '@postybirb/types';
import { BaseWebsiteOptions } from './base-website-options';

export class DefaultWebsiteOptions extends BaseWebsiteOptions {
  @TextField({
    label: 'contentWarning',
    col: 1,
    row: 2,
  })
  contentWarning = '';

  @RatingField({})
  rating: SubmissionRating = SubmissionRating.GENERAL;
}
