import {
  DescriptionField,
  RatingField,
  TagField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class NewgroundsMessageSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.HTML,
  })
  description: DescriptionValue;

  @TagField({
    maxTags: 12,
    spaceReplacer: '-',
  })
  tags: TagValue;

  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'Suitable for everyone' },
      {
        value: 't',
        label: 'May be inappropriate for kids under 13',
      },
      {
        value: SubmissionRating.MATURE,
        label: 'Mature subject matter. Not for kids!',
      },
      {
        value: SubmissionRating.ADULT,
        label: 'Adults only! This is NSFW and not for kids!',
      },
    ],
  })
  rating: SubmissionRating;
}
