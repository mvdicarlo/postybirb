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
import { KoFiAccountData } from './ko-fi-account-data';

export class KoFiFileSubmission extends BaseWebsiteOptions {
  @TagField({
    hidden: true,
  })
  declare tags: TagValue;

  @RatingField({
    options: [{ value: SubmissionRating.GENERAL, label: 'General' }],
  })
  declare rating: SubmissionRating;

  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
  })
  declare description: DescriptionValue;

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
