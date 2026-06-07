import {
  BooleanField,
  DescriptionField,
  RatingField,
  SelectField,
  TagField,
} from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { KoFiAccountData } from './ko-fi-account-data';

export class KoFiFileSubmission extends BaseWebsiteOptions {
  @TagField({
    hidden: true,
  })
  tags: TagValue = DefaultTagValue();

  @RatingField({
    options: [{ value: SubmissionRating.GENERAL, label: 'General' }],
  })
  rating: SubmissionRating = SubmissionRating.GENERAL;

  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
  })
  description: DescriptionValue = DefaultDescriptionValue();

  @SelectField<KoFiAccountData>({
    label: 'folder',
    section: 'website',
    span: 6,
    options: [],
    derive: [
      {
        key: 'folders',
        populate: 'options',
      },
    ],
  })
  album?: string;

  @SelectField({
    label: 'audience',
    section: 'website',
    span: 6,
    options: [
      { value: 'public', label: 'Public' },
      { value: 'supporter', label: 'All Supporters (One-off & Monthly)' },
      {
        value: 'recurringSupporter',
        label: 'All Monthly Supporters (Members)',
      },
    ],
  })
  audience = 'public';

  @BooleanField({
    label: 'hiRes',
    section: 'website',
    span: 6,
  })
  hiRes = false;
}
