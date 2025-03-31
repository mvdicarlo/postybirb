import { RatingField, TagField, TitleField } from '@postybirb/form-builder';
import { DefaultTagValue, SubmissionRating, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class PixivMessageSubmission extends BaseWebsiteOptions {
  @TitleField({
    maxLength: 32,
  })
  title: string;

  @TagField({
    maxTags: 10,
  })
  tags: TagValue = DefaultTagValue();

  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'All ages' },
      { value: SubmissionRating.MATURE, label: 'R18' },
      { value: SubmissionRating.EXTREME, label: 'R-18G' },
    ],
  })
  rating: SubmissionRating;
}
