import {
  DescriptionField,
  RatingField,
  RatingOption,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import {
  IWebsiteFormFields,
  DefaultDescriptionValue,
  DescriptionValue,
  SubmissionRating,
  TagValue,
  DefaultTagValue,
} from '@postybirb/types';

export const DefaultRatingOptions: RatingOption[] = [
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

export class DefaultWebsiteOptions implements IWebsiteFormFields {
  @TextField({
    label: 'Title',
    defaultValue: '',
    required: true,
    row: 0,
    column: 1,
  })
  title: string;

  @TagField({
    label: 'Tags',
    defaultValue: DefaultTagValue,
    row: 2,
    column: 1,
  })
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
  description: DescriptionValue;

  @RatingField({
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
