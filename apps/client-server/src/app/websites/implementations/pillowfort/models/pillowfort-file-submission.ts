import {
  BooleanField,
  RatingField,
  SelectField,
} from '@postybirb/form-builder';
import { SubmissionRating } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class PillowfortFileSubmission extends BaseWebsiteOptions {
  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'SFW' },
      { value: SubmissionRating.ADULT, label: 'NSFW' },
    ],
  })
  rating: SubmissionRating;

  @SelectField({
    label: 'visibility',
    defaultValue: 'public',
    options: [
      { value: 'public', label: 'Public' },
      { value: 'private', label: 'Private' },
    ],
  })
  privacy: string;

  @BooleanField({
    label: 'allowComments',
    defaultValue: true,
  })
  allowComments: boolean;

  @BooleanField({
    label: 'allowReblogging',
    defaultValue: true,
  })
  allowReblogging: boolean;

  @BooleanField({
    label: 'useTitle',
    defaultValue: true,
  })
  useTitle: boolean;
}
