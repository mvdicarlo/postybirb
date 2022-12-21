import {
  TextField,
  TagField,
  RadioField,
  DescriptionField,
} from '@postybirb/form-builder';
import {
  BaseWebsiteOptions,
  DefaultTagValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { DefaultRatingOptions } from '../../../models/default-website-options';

export class FurAffinityMessageSubmission implements BaseWebsiteOptions {
  @TextField({
    label: 'Title',
    defaultValue: '',
    row: 0,
    column: 1,
  })
  title: string;

  @TagField({ label: 'Tags', defaultValue: DefaultTagValue, row: 2, column: 1 })
  tags: TagValue;

  @DescriptionField({
    label: 'Description',
    defaultValue: {
      overrideDefault: false,
      description: '',
    },
    row: 3,
    column: 1,
  })
  description: unknown;

  @RadioField({
    label: 'Rating',
    defaultValue: SubmissionRating.GENERAL,
    options: DefaultRatingOptions,
    required: true,
    row: 0,
    column: 0,
    layout: 'vertical',
  })
  rating: SubmissionRating;
}
