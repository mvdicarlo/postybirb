import {
  DescriptionField,
  RatingField,
  RatingOption,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  DescriptionValue,
  IWebsiteFormFields,
  SubmissionRating,
  TagValue,
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
  tags: DefaultTagValue(),
  description: DefaultDescriptionValue(),
  rating: SubmissionRating.GENERAL,
};

export class DefaultWebsiteOptions implements IWebsiteFormFields {
  @TextField({
    label: 'Title',
    defaultValue: DefaultWebsiteOptionsObject.title,
    required: true,
    gridSpan: 12,
  })
  title: string;

  @TagField({
    label: 'Tags',
    defaultValue: DefaultWebsiteOptionsObject.tags,
    gridSpan: 12,
  })
  tags: TagValue;

  @DescriptionField({
    label: 'Description',
    defaultValue: DefaultWebsiteOptionsObject.description,
    gridSpan: 9,
  })
  description: DescriptionValue;

  @RatingField({
    label: 'Rating',
    defaultValue: DefaultWebsiteOptionsObject.rating,
    options: DefaultRatingOptions,
    required: true,
    gridSpan: 3,
    layout: 'vertical',
  })
  rating: SubmissionRating;
}
