import {
  DescriptionField,
  RatingField,
  SelectField,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import {
  DefaultTagValue,
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class MegalodonFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
    required: false,
    expectsInlineTags: true,
    expectsInlineTitle: true,
  })
  description: DescriptionValue;

  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'Safe' },
      { value: SubmissionRating.ADULT, label: 'Sensitive' },
    ],
  })
  rating: SubmissionRating;

  @TagField({
    spaceReplacer: '_',
  })
  tags: TagValue = DefaultTagValue();

  override processTag(tag: string) {
    return `${tag.replaceAll(/\s+/g, '_')}`;
  }

  @SelectField({
    label: 'visibility',
    options: [
      { value: 'public', label: 'Public' },
      { value: 'unlisted', label: 'Unlisted' },
      { value: 'private', label: 'Followers only' },
      { value: 'direct', label: 'Direct' },
    ],
    span: 12,
  })
  visibility: 'public' | 'unlisted' | 'private' | 'direct' = 'public';

  @TextField({
    label: 'spoiler',
    span: 12,
  })
  spoilerText?: string;
}
