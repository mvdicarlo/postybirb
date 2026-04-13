import {
  BooleanField,
  DescriptionField,
  SelectField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import {
  DefaultTagValue,
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { TumblrAccountData } from './tumblr-account-data';

export class TumblrFileSubmission extends BaseWebsiteOptions {
  @TitleField({
    expectedInDescription: true,
  })
  title = '';

  @DescriptionField({
    descriptionType: DescriptionType.CUSTOM,
  })
  description: DescriptionValue;

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
    span: 6,
  })
  blog: string;
}
