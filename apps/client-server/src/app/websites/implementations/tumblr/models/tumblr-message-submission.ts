import {
  BooleanField,
  DescriptionField,
  SelectField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { TumblrAccountData } from './tumblr-account-data';

export class TumblrMessageSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.CUSTOM,
  })
  description: DescriptionValue;

  @SelectField<TumblrAccountData>({
    label: 'blog',
    options: [],
    required: true,
    derive: [
      {
        key: 'blogs',
        populate: 'options',
      },
    ],
    span: 12,
  })
  blog: string;

  @TagField({
    section: 'common',
    order: 3,
    span: 12,
    spaceReplacer: ' ',
  })
  tags: TagValue = DefaultTagValue();

  @BooleanField({
    label: 'drugUse',
    span: 4,
    showWhen: [
      [
        'rating',
        [
          SubmissionRating.MATURE,
          SubmissionRating.ADULT,
          SubmissionRating.EXTREME,
        ],
      ],
    ],
  })
  drugUse = false;

  @BooleanField({
    label: 'violence',
    span: 4,
    showWhen: [
      [
        'rating',
        [
          SubmissionRating.MATURE,
          SubmissionRating.ADULT,
          SubmissionRating.EXTREME,
        ],
      ],
    ],
  })
  violence = false;

  @BooleanField({
    label: 'sexualContent',
    span: 4,
    showWhen: [
      [
        'rating',
        [
          SubmissionRating.MATURE,
          SubmissionRating.ADULT,
          SubmissionRating.EXTREME,
        ],
      ],
    ],
  })
  sexualContent = false;
}
