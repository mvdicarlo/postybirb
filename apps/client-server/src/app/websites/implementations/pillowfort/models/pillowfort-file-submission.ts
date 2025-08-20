import {
  BooleanField,
  RadioField,
  RatingField
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

  @RadioField({
    label: 'visibility',
    section: 'website',
    span: 6,
    defaultValue: 'public',
    options: [
      { value: 'public', label: 'Public' },
      { value: 'private', label: 'Private' },
    ],
  })
  privacy: string;

  @BooleanField({
    label: 'allowComments',
    section: 'website',
    span: 6,
    defaultValue: true,
  })
  allowComments: boolean;

  @BooleanField({
    label: 'allowReblogging',
    section: 'website',
    span: 6,
    defaultValue: true,
  })
  allowReblogging: boolean;

  @BooleanField({
    label: 'useTitle',
    section: 'website',
    span: 6,
    defaultValue: true,
  })
  useTitle: boolean;
}
