import { RatingField, TagField, TextField } from '@postybirb/form-builder';
import {
  BaseWebsiteOptions,
  DefaultTagValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { DefaultRatingOptions } from '../../../models/default-website-options';

export class DiscordMessageSubmission implements BaseWebsiteOptions {
  @TextField({ label: 'Title', defaultValue: '' })
  title?: string;

  @TagField({ label: 'Tags', defaultValue: DefaultTagValue })
  tags: TagValue;

  @TextField({ label: 'Description', defaultValue: '' })
  description: unknown;

  @RatingField({
    label: 'Rating',
    defaultValue: undefined,
    options: DefaultRatingOptions,
  })
  rating: SubmissionRating;
}
