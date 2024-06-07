import {
  DescriptionField,
  RatingField,
  TextField,
} from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DescriptionValue,
  IWebsiteFormFields,
  SubmissionRating,
} from '@postybirb/types';
import { DefaultRatingOptions } from '../../../models/default-website-options';

export class DiscordMessageSubmission implements IWebsiteFormFields {
  @TextField({
    label: 'Title',
    defaultValue: '',
    gridSpan: 12,
  })
  title: string;

  @DescriptionField({
    label: 'Description',
    defaultValue: DefaultDescriptionValue(),
    gridSpan: 9,
  })
  description: DescriptionValue;

  @RatingField({
    label: 'Rating',
    defaultValue: undefined,
    options: DefaultRatingOptions,
    required: true,
    gridSpan: 3,
    layout: 'vertical',
  })
  rating: SubmissionRating;
}
