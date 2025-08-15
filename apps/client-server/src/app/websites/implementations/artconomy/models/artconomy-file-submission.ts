import {
  BooleanField,
  DescriptionField,
  RatingField,
  TagField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class ArtconomyFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.MARKDOWN,
    maxDescriptionLength: 2000,
  })
  description: DescriptionValue;

  @TagField({
    minTags: 5,
  })
  tags: TagValue;

  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'Clean/Safe' },
      { value: SubmissionRating.MATURE, label: 'Risque' },
      { value: SubmissionRating.ADULT, label: 'Adult' },
      { value: SubmissionRating.EXTREME, label: 'Offensive/Disturbing' },
    ],
  })
  rating: SubmissionRating;

  @BooleanField({
    label: 'private',
    section: 'website',
    span: 6,
    defaultValue: false,
  })
  isPrivate: boolean;

  @BooleanField({
    label: 'disableComments',
    section: 'website',
    span: 6,
    defaultValue: false,
  })
  commentsDisabled: boolean;

  @BooleanField({
    label: 'originalWork',
    section: 'website',
    span: 6,
    defaultValue: true,
  })
  isArtist: boolean;
}
