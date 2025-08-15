import {
  BooleanField,
  DescriptionField,
  RatingField,
  SelectField,
  TagField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { SofurryAccountData } from './sofurry-account-data';

export class SofurryFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.HTML,
  })
  description: DescriptionValue;

  @TagField({
    minTags: 2,
  })
  tags: TagValue;

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
    section: 'website',
    span: 12,
  })
  folder: string;

  @BooleanField({
    label: 'thumbnailAsCoverArt',
    defaultValue: false,
    section: 'website',
    span: 12,
  })
  thumbnailAsCoverArt: boolean;
}
