import {
  BooleanField,
  RatingField,
  SelectField,
} from '@postybirb/form-builder';
import {
  DescriptionValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { KoFiAccountData } from './ko-fi-account-data';

export class KoFiFileSubmission extends BaseWebsiteOptions {
  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'General' },
    ],
  })
  rating: SubmissionRating;

  @SelectField<KoFiAccountData>({
    label: 'album',
    options: [],
    derive: [
      {
        key: 'galleryFolders',
        populate: 'options',
      },
    ],
  })
  album?: string;

  @SelectField({
    label: 'audience',
    defaultValue: 'public',
    options: [
      { value: 'public', label: 'Public' },
      { value: 'supporter', label: 'All Supporters (One-off & Monthly)' },
      { value: 'recurringSupporter', label: 'All Monthly Supporters (Members)' },
    ],
  })
  audience: string = 'public';

  @BooleanField({
    label: 'hiRes',
    defaultValue: false,
  })
  hiRes: boolean = false;
}