import {
  BooleanField,
  RatingField,
  SelectField,
} from '@postybirb/form-builder';
import { SubmissionRating } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { KoFiAccountData } from './ko-fi-account-data';

export class KoFiFileSubmission extends BaseWebsiteOptions {
  @RatingField({
    options: [{ value: SubmissionRating.GENERAL, label: 'General' }],
  })
  rating: SubmissionRating;

  @SelectField<KoFiAccountData>({
    label: 'folder',
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
  })
  hiRes = false;
}
