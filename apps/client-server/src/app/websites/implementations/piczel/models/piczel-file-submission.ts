import {
  DescriptionField,
  RatingField,
  SelectField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class PiczelFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.MARKDOWN,
  })
  description: DescriptionValue;

  @SelectField({
    label: 'folder',
    section: 'website',
    span: 6,
    derive: [
      {
        key: 'folders',
        populate: 'options',
      },
    ],
    options: [],
  })
  folder: string;

  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'SFW' },
      { value: SubmissionRating.ADULT, label: 'NSFW' },
    ],
  })
  rating: SubmissionRating;
}
