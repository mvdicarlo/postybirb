import { DescriptionField, RatingField } from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { TagCase, TagCaseField } from '../../../models/tag-case';

export class TwitterMessageSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
    expectsInlineTags: true,
    expectsInlineTitle: true,
  })
  declare description: DescriptionValue;

  @TagCaseField()
  tagCase: TagCase = 'snake';

  @RatingField({
    options: [
      {
        label: 'Safe',
        value: SubmissionRating.GENERAL,
      },
      {
        label: 'Sensitive',
        value: SubmissionRating.ADULT,
      },
    ],
  })
  declare rating: SubmissionRating;
}
