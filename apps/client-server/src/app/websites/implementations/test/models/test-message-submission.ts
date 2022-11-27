import { RadioField, TagField, TextField } from '@postybirb/form-builder';
import {
  BaseWebsiteOptions,
  DefaultTagValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { DefaultRatingOptions } from '../../../models/default-website-data';

export class TestMessageSubmission implements BaseWebsiteOptions {
  @TextField({ label: 'Title', defaultValue: '' })
  title?: string;

  @TagField({ label: 'Tags', defaultValue: DefaultTagValue })
  tags: TagValue;

  @TextField({ label: 'Description', defaultValue: '' })
  description: unknown;

  @RadioField({
    label: 'Rating',
    defaultValue: SubmissionRating.GENERAL,
    options: DefaultRatingOptions,
  })
  rating: SubmissionRating;
}
