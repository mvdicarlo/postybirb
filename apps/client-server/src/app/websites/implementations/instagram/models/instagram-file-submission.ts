import {
  DescriptionField,
  RatingField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import {
  DefaultTagValue,
  DescriptionType,
  DescriptionValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class InstagramFileSubmission extends BaseWebsiteOptions {
  @TitleField({
    expectedInDescription: true,
  })
  title = '';

  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
    maxDescriptionLength: 2200,
  })
  description: DescriptionValue;

  @TagField({
    maxTags: 30,
    expectedInDescription: true,
  })
  tags: TagValue = DefaultTagValue();

  @RatingField({
    options: [
      {
        label: 'General',
        value: SubmissionRating.GENERAL,
      },
      {
        label: 'Sensitive',
        value: SubmissionRating.ADULT,
      },
    ],
  })
  rating: SubmissionRating;

  /**
   * Process tags into Instagram hashtag format.
   * Instagram hashtags are prefixed with # and have no spaces.
   */
  override processTag(tag: string): string {
    const cleaned = tag.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '');
    return cleaned ? `${cleaned}` : '';
  }
}
