import {
  DescriptionField,
  RatingField,
  RatingOption,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import {
  IWebsiteFormFields,
  DescriptionValue,
  SubmissionRating,
  TagValue,
  DefaultTagValue,
  DefaultDescriptionValue,
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

export const DefaultWebsiteOptionsObject: IWebsiteFormFields = {
  title: '',
  tags: DefaultTagValue,
  description: DefaultDescriptionValue,
  rating: SubmissionRating.GENERAL,
};

export class DefaultWebsiteOptions implements IWebsiteFormFields {
  @TextField({
    label: 'Title',
    defaultValue: DefaultWebsiteOptionsObject.title,
    required: true,
    row: 0,
    column: 1,
  })
  title: string;

  @TagField({
    label: 'Tags',
    defaultValue: DefaultWebsiteOptionsObject.tags,
    row: 2,
    column: 1,
  })
  tags: TagValue;

  @DescriptionField({
    label: 'Description',
    defaultValue: DefaultWebsiteOptionsObject.description,
    row: 3,
    column: 1,
  })
  description: DescriptionValue;

  @RatingField({
    label: 'Rating',
    defaultValue: DefaultWebsiteOptionsObject.rating,
    options: DefaultRatingOptions,
    required: true,
    row: 0,
    column: 0,
    layout: 'vertical',
  })
  rating: SubmissionRating;
}
