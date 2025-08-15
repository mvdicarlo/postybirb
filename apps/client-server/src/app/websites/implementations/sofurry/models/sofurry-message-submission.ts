import {
  DescriptionField,
  RatingField,
  SelectField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { SofurryAccountData } from './sofurry-account-data';

export class SofurryMessageSubmission extends BaseWebsiteOptions {
  @TitleField({ maxLength: 100 })
  title: string;

  @DescriptionField({
    descriptionType: DescriptionType.HTML,
  })
  description: DescriptionValue;

  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'All Ages' },
      { value: SubmissionRating.ADULT, label: 'Adult' },
      { value: SubmissionRating.EXTREME, label: 'Extreme' },
    ],
  })
  rating: SubmissionRating;

  @SelectField<SofurryAccountData>({
    label: 'folder',
    defaultValue: '0',
    options: [],
    derive: [
      {
        key: 'folders',
        populate: 'options',
      },
    ],
    col: 2,
  })
  folder: string;
}
