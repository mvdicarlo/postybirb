import {
  BooleanField,
  DescriptionField,
  RatingField,
  SelectField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import { DescriptionValue, SubmissionRating, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class PillowfortMessageSubmission extends BaseWebsiteOptions {
  @TitleField({ label: 'Title', required: true })
  title: string;

  @DescriptionField({})
  description: DescriptionValue;

  @TagField({ maxTags: 30 })
  tags: TagValue;

  @RatingField({})
  rating: SubmissionRating;

  @SelectField({
    label: 'Privacy',
    defaultValue: 'public',
    options: [
      { value: 'public', label: 'Public' },
      { value: 'private', label: 'Private' },
    ],
  })
  privacy: string;

  @BooleanField({
    label: 'Allow Comments',
    defaultValue: true,
  })
  allowComments: boolean;

  @BooleanField({
    label: 'Allow Reblogging',
    defaultValue: true,
  })
  allowReblogging: boolean;

  @BooleanField({
    label: 'Use Title',
    defaultValue: true,
  })
  useTitle: boolean;
}