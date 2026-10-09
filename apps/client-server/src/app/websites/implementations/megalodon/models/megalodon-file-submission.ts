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
  MegalodonAccountData,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class MegalodonFileSubmission extends BaseWebsiteOptions {
  @DescriptionField<MegalodonAccountData>({
    descriptionType: DescriptionType.PLAINTEXT,
    required: false,
    expectsInlineTags: true,
    expectsInlineTitle: true,
    // Static fallback used before instance limits are fetched. Overridden per
    // instance via `derive` from the account's stored `maxCharacters`.
    maxDescriptionLength: 500,
    derive: [{ key: 'maxCharacters', populate: 'maxDescriptionLength' }],
  })
  declare description: DescriptionValue;

  @RatingField({
    options: [
      { value: SubmissionRating.GENERAL, label: 'Safe' },
      { value: SubmissionRating.ADULT, label: 'Sensitive' },
    ],
  })
  declare rating: SubmissionRating;

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
    span: 6,
  })
  visibility: 'public' | 'unlisted' | 'private' | 'direct' = 'public';

  @TextField({
    label: 'spoiler',
    span: 6,
  })
  spoilerText?: string;
}
