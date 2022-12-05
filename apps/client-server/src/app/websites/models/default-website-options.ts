import {
  DescriptionField,
  RadioField,
  RadioOption,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import {
  BaseWebsiteOptions,
  DefaultTagValue,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';

export const DefaultRatingOptions: RadioOption[] = [
  {
    label: 'General',
    value: SubmissionRating.GENERAL,
  },
  {
    label: 'Mature',
    value: SubmissionRating.MATURE,
  },
  {
    label: 'Adult',
    value: SubmissionRating.ADULT,
  },
  {
    label: 'Extreme',
    value: SubmissionRating.EXTREME,
  },
];

export class DefaultWebsiteOptions implements BaseWebsiteOptions {
  @TextField({
    label: 'Title',
    defaultValue: '',
    required: true,
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
      description: {},
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
